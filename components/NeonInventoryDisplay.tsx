import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Badge,
  Spinner,
  Box,
  Flex,
  Button,
  TextInput,
  useToast,
} from '@sanity/ui';
import { RefreshIcon, RestoreIcon, RevertIcon } from '@sanity/icons';
import { useClient, useCurrentUser, useFormValue } from 'sanity';

interface VariantInventory {
  sku: string;
  stock: number;
  size: string;
  color: string | null;
}

interface NeonInventoryData {
  productName: string;
  productSlug: string;
  totalStock: number;
  variants: VariantInventory[];
}

type AdjustmentKind = 'set' | 'undo' | 'redo';

interface HistoryEntry {
  _id: string;
  _createdAt: string;
  sku: string;
  variantLabel?: string;
  previousStock: number;
  newStock: number;
  note?: string;
  changedBy?: string;
  status: 'pending' | 'applied' | 'rejected';
  error?: string;
  kind?: AdjustmentKind;
  undone?: boolean;
}

const HISTORY_QUERY = `*[_type == "inventoryAdjustment" && productSlug == $slug] | order(_createdAt desc)[0...25]{
  _id, _createdAt, sku, variantLabel, previousStock, newStock, note, changedBy, status, error, kind, undone
}`;

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : String(delta));

// Use production URL by default, fallback to localhost for local dev
const API_BASE_URL = process.env.SANITY_STUDIO_API_URL || 'https://gsdesignresearch.com';

const getLowStockTone = (stock: number): 'positive' | 'caution' | 'critical' => {
  if (stock === 0) return 'critical';
  if (stock < 5) return 'caution';
  return 'positive';
};

// Size-only variants are stored with color "Size" and single-SKU products with
// size "Default"; neither is worth showing next to the real option name.
const variantLabel = (variant: VariantInventory) =>
  [variant.color && variant.color !== 'Size' ? variant.color : null, variant.size]
    .filter(Boolean)
    .join(' ');

/**
 * Custom Sanity Studio component that shows live inventory from the Neon
 * database (the source of truth) and lets editors change it.
 *
 * Saving creates an `inventoryAdjustment` document with the editor's own Sanity
 * session and asks the website to apply it — see gsweb
 * app/api/inventory-adjustment/route.ts for why it goes through Sanity.
 *
 * Those same documents are shown here as the product's change history, with
 * Undo/Redo on each edit. Undo reverses the edit's difference against today's
 * stock (restock of +10 → undo is -10), so sales made since are kept.
 */
export function NeonInventoryDisplay() {
  const slug = useFormValue(['slug', 'current']) as string | undefined;
  const client = useClient({ apiVersion: '2024-01-01' });
  const currentUser = useCurrentUser();
  const toast = useToast();

  const [inventoryData, setInventoryData] = useState<NeonInventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unsaved edits, keyed by SKU
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // SKU of a stock save, or history entry id of an undo/redo, while in flight
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!slug) {
      setHistory([]);
      return;
    }

    try {
      setHistory(await client.fetch<HistoryEntry[]>(HISTORY_QUERY, { slug }));
    } catch (err) {
      console.error('[Neon Inventory] History fetch error:', err);
    }
  }, [client, slug]);

  const fetchNeonInventory = useCallback(async () => {
    if (!slug) {
      setInventoryData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/neon-inventory?slug=${encodeURIComponent(slug)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' }, mode: 'cors' }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            'Product not in the database yet. Publish it — its stock records are created automatically within a few seconds, then click Refresh.'
          );
        } else {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return;
      }

      setInventoryData(await response.json());
      setDrafts({});
    } catch (err) {
      console.error('[Neon Inventory] Fetch error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to API. Check that gsdesignresearch.com is accessible.');
      } else {
        setError(`Failed to fetch inventory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchNeonInventory();
  }, [fetchNeonInventory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refresh = () => {
    fetchNeonInventory();
    fetchHistory();
  };

  const setVariantStock = (sku: string, stock: number) => {
    setInventoryData((data) => {
      if (!data) return data;
      const variants = data.variants.map((v) => (v.sku === sku ? { ...v, stock } : v));
      return { ...data, variants, totalStock: variants.reduce((sum, v) => sum + v.stock, 0) };
    });
    setDrafts(({ [sku]: _discarded, ...rest }) => rest);
  };

  /** Logs an adjustment in Sanity and asks the website to apply it. */
  const applyAdjustment = async ({
    variant,
    newStock,
    kind,
    target,
    busy,
    successTitle,
  }: {
    variant: VariantInventory;
    newStock: number;
    kind: AdjustmentKind;
    target?: HistoryEntry;
    busy: string;
    successTitle: string;
  }) => {
    setBusyKey(busy);

    try {
      const adjustment = await client.create({
        _type: 'inventoryAdjustment',
        productName: inventoryData?.productName,
        productSlug: slug,
        sku: variant.sku,
        variantLabel: variantLabel(variant),
        previousStock: variant.stock,
        newStock,
        kind,
        target: target ? { _type: 'reference', _ref: target._id, _weak: true } : undefined,
        note: note.trim() || undefined,
        changedBy: currentUser?.name || currentUser?.email,
        status: 'pending',
      });

      const response = await fetch(`${API_BASE_URL}/api/inventory-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentId: adjustment._id }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setVariantStock(variant.sku, newStock);
        toast.push({ status: 'success', title: successTitle });
        return;
      }

      if (response.status === 409 && typeof result.currentStock === 'number') {
        // Someone bought one while the editor was typing — show the real count
        // and let them decide again rather than overwriting the sale.
        setVariantStock(variant.sku, result.currentStock);
        toast.push({
          status: 'warning',
          title: 'Stock changed before your save',
          description: `It is now ${result.currentStock} (probably a new order). Nothing was changed — check the number and try again.`,
        });
        return;
      }

      throw new Error(result.error || `HTTP ${response.status}`);
    } catch (err) {
      console.error('[Neon Inventory] Save error:', err);
      toast.push({
        status: 'error',
        title: 'Could not update stock',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusyKey(null);
      fetchHistory();
    }
  };

  const saveStock = (variant: VariantInventory) => {
    const newStock = Number(drafts[variant.sku]);

    if (!Number.isInteger(newStock) || newStock < 0) {
      toast.push({ status: 'error', title: 'Stock must be a whole number of 0 or more' });
      return;
    }

    applyAdjustment({
      variant,
      newStock,
      kind: 'set',
      busy: variant.sku,
      successTitle: `${variantLabel(variant) || variant.sku} set to ${newStock}`,
    });
  };

  const undoOrRedo = (entry: HistoryEntry) => {
    const variant = inventoryData?.variants.find((v) => v.sku === entry.sku);
    if (!variant) return;

    const kind: AdjustmentKind = entry.undone ? 'redo' : 'undo';
    const delta = entry.newStock - entry.previousStock;
    const newStock = variant.stock + (kind === 'undo' ? -delta : delta);
    const label = entry.variantLabel || entry.sku;

    if (newStock < 0) {
      toast.push({
        status: 'error',
        title: `Can't ${kind} this change`,
        description: `It would take ${label} from ${variant.stock} to ${newStock}. Stock has dropped since this change (probably orders).`,
      });
      return;
    }

    applyAdjustment({
      variant,
      newStock,
      kind,
      target: entry,
      busy: entry._id,
      successTitle: `${kind === 'undo' ? 'Undid' : 'Redid'} ${formatDelta(delta)} on ${label} — now ${newStock}`,
    });
  };

  if (!slug) {
    return (
      <Card padding={3} radius={2} shadow={1} tone="caution">
        <Text size={1}>💡 Save the product with a slug to view Neon inventory</Text>
      </Card>
    );
  }

  if (loading && !inventoryData) {
    return (
      <Card padding={3} radius={2} shadow={1}>
        <Stack space={2}>
          <Spinner />
          <Text size={1}>Loading inventory from Neon...</Text>
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding={3} radius={2} shadow={1} tone="critical">
        <Text size={1}>⚠️ {error}</Text>
      </Card>
    );
  }

  if (!inventoryData) {
    return null;
  }

  return (
    <Card padding={4} radius={2} shadow={1} tone="default" style={{ border: '2px solid #4f46e5' }}>
      <Stack space={3}>
        <Flex align="flex-start" justify="space-between" gap={2}>
          <Stack space={2}>
            <Text size={1} weight="bold" style={{ color: '#4f46e5' }}>
              📊 NEON DATABASE INVENTORY (Source of Truth)
            </Text>
            <Text size={1} muted>
              This is the live stock the website sells from. Changes save immediately — no need to
              publish.
            </Text>
          </Stack>
          <Button
            icon={RefreshIcon}
            mode="ghost"
            fontSize={1}
            padding={2}
            text="Refresh"
            disabled={loading || busyKey !== null}
            onClick={refresh}
          />
        </Flex>

        <Box paddingTop={2}>
          <Stack space={3}>
            <Card padding={3} radius={2} tone={getLowStockTone(inventoryData.totalStock)}>
              <Text size={2} weight="bold">
                Total Stock: {inventoryData.totalStock} units
              </Text>
            </Card>

            {inventoryData.variants.length > 0 && (
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Stock by option:
                </Text>
                <Stack space={2}>
                  {inventoryData.variants.map((variant) => {
                    const draft = drafts[variant.sku];
                    const isDirty = draft !== undefined && draft !== String(variant.stock);
                    const isSaving = busyKey === variant.sku;

                    return (
                      <Card
                        key={variant.sku}
                        padding={2}
                        radius={2}
                        tone={getLowStockTone(variant.stock)}
                      >
                        <Flex align="center" justify="space-between" gap={3}>
                          <Stack space={1} flex={1}>
                            <Text size={1} weight="medium">
                              {variantLabel(variant) || 'Default'}
                            </Text>
                            <Text size={0} muted>
                              SKU: {variant.sku}
                            </Text>
                          </Stack>
                          <Badge tone={getLowStockTone(variant.stock)} fontSize={1}>
                            {variant.stock} in stock
                          </Badge>
                          <Box style={{ width: 90 }}>
                            <TextInput
                              type="number"
                              min={0}
                              step={1}
                              fontSize={1}
                              padding={2}
                              value={draft ?? String(variant.stock)}
                              disabled={isSaving}
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                setDrafts((current) => ({ ...current, [variant.sku]: value }));
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && isDirty) {
                                  event.preventDefault();
                                  saveStock(variant);
                                }
                              }}
                            />
                          </Box>
                          <Button
                            text={isSaving ? 'Saving…' : 'Save'}
                            tone="primary"
                            fontSize={1}
                            padding={2}
                            disabled={!isDirty || busyKey !== null}
                            onClick={() => saveStock(variant)}
                          />
                        </Flex>
                      </Card>
                    );
                  })}
                </Stack>
              </Stack>
            )}

            <Stack space={2}>
              <Text size={1} muted>
                Reason (optional, saved to the Inventory Log)
              </Text>
              <TextInput
                fontSize={1}
                padding={2}
                placeholder="e.g. Restock, damaged item, recount"
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
              />
            </Stack>

            {history.length > 0 && (
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Recent changes:
                </Text>
                <Stack space={1}>
                  {history.map((entry) => {
                    const delta = entry.newStock - entry.previousStock;
                    const kind = entry.kind ?? 'set';
                    const canToggle =
                      kind === 'set' &&
                      entry.status === 'applied' &&
                      delta !== 0 &&
                      inventoryData.variants.some((v) => v.sku === entry.sku);
                    const rejected = entry.status === 'rejected';

                    return (
                      <Card
                        key={entry._id}
                        padding={2}
                        radius={2}
                        tone={rejected ? 'critical' : 'transparent'}
                        border
                        style={{ opacity: rejected || entry.undone ? 0.65 : 1 }}
                      >
                        <Flex align="center" justify="space-between" gap={3}>
                          <Stack space={2} flex={1}>
                            <Text
                              size={1}
                              weight="medium"
                              style={{ textDecoration: entry.undone ? 'line-through' : undefined }}
                            >
                              {kind === 'undo' ? '↩️ Undo · ' : kind === 'redo' ? '↪️ Redo · ' : ''}
                              {entry.variantLabel || entry.sku}: {entry.previousStock} → {entry.newStock}{' '}
                              ({formatDelta(delta)})
                            </Text>
                            <Text size={0} muted>
                              {new Date(entry._createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                              {entry.changedBy ? ` · ${entry.changedBy}` : ''}
                              {entry.note ? ` · “${entry.note}”` : ''}
                              {entry.undone ? ' · undone' : ''}
                              {rejected ? ` · not applied${entry.error ? `: ${entry.error}` : ''}` : ''}
                              {entry.status === 'pending' ? ' · pending' : ''}
                            </Text>
                          </Stack>
                          {canToggle && (
                            <Button
                              icon={entry.undone ? RestoreIcon : RevertIcon}
                              text={
                                busyKey === entry._id
                                  ? entry.undone
                                    ? 'Redoing…'
                                    : 'Undoing…'
                                  : entry.undone
                                    ? 'Redo'
                                    : 'Undo'
                              }
                              mode="ghost"
                              fontSize={1}
                              padding={2}
                              disabled={busyKey !== null}
                              onClick={() => undoOrRedo(entry)}
                            />
                          )}
                        </Flex>
                      </Card>
                    );
                  })}
                </Stack>
              </Stack>
            )}
          </Stack>
        </Box>

        <Card padding={2} radius={1} tone="transparent" style={{ borderTop: '1px solid #e5e7eb' }}>
          <Text size={0} muted>
            💡 Every change is recorded here and under Inventory Log. Undo reverses a change's
            difference against today's stock, so orders placed since are kept. The quantity fields further down only set
            the starting stock for new options.
          </Text>
        </Card>
      </Stack>
    </Card>
  );
}
