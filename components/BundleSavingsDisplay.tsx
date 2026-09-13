import React, { useEffect, useState } from 'react';
import { Card, Stack, Text, Badge, Spinner, Box, Flex } from '@sanity/ui';
import { useClient, useFormValue } from 'sanity';

interface BundleItemRef {
  product?: { _ref?: string };
  quantity?: number;
}

interface ResolvedProduct {
  _id: string;
  name: string;
  slug: string | null;
  price: number | null;
}

interface ComponentRow extends ResolvedProduct {
  quantity: number;
  stock: number | null;
}

const API_BASE =
  process.env.SANITY_STUDIO_API_URL || 'https://gsdesignresearch.com';

/**
 * Read-only summary shown at the top of a Bundle Deal document.
 *
 * Bundles hold no stock of their own - they expand into their component
 * products at checkout. So the useful numbers to surface here are:
 *   - what the components cost separately (vs. the bundle price)
 *   - how many complete bundles current Neon stock can actually fulfil
 */
export function BundleSavingsDisplay() {
  const client = useClient({ apiVersion: '2023-05-03' });
  const items = useFormValue(['items']) as BundleItemRef[] | undefined;
  const bundlePrice = useFormValue(['bundlePrice']) as number | undefined;

  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key so we only refetch when the referenced products actually change
  const refKey = (items || [])
    .map((i) => `${i?.product?._ref || 'none'}:${i?.quantity ?? 1}`)
    .join('|');

  useEffect(() => {
    const refs = (items || [])
      .map((i) => i?.product?._ref)
      .filter((r): r is string => Boolean(r));

    if (refs.length === 0) {
      setRows([]);
      setError(null);

      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Resolve referenced products from Sanity
        const products: ResolvedProduct[] = await client.fetch(
          `*[_type == "product" && _id in $refs]{
             _id,
             name,
             "slug": slug.current,
             price
           }`,
          { refs },
        );

        const byId = new Map(products.map((p) => [p._id, p]));

        // 2. Pull live stock per product from Neon (best-effort; the summary
        //    still renders pricing if the API is unreachable)
        const withStock = await Promise.all(
          (items || []).map(async (item): Promise<ComponentRow | null> => {
            const ref = item?.product?._ref;

            if (!ref) return null;

            const product = byId.get(ref);

            if (!product) return null;

            const quantity = item?.quantity ?? 1;
            let stock: number | null = null;

            if (product.slug) {
              try {
                const res = await fetch(
                  `${API_BASE}/api/neon-inventory?slug=${encodeURIComponent(product.slug)}`,
                  {
                    headers: { 'Content-Type': 'application/json' },
                    mode: 'cors',
                  },
                );

                if (res.ok) {
                  const data = await res.json();

                  stock =
                    typeof data?.totalStock === 'number' ? data.totalStock : null;
                }
              } catch {
                // Leave stock as null - pricing is still worth showing
              }
            }

            return { ...product, quantity, stock };
          }),
        );

        if (!cancelled) {
          setRows(withStock.filter((r): r is ComponentRow => r !== null));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load bundle summary',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey, client]);

  if (!items || items.length === 0) {
    return (
      <Card padding={3} radius={2} shadow={1} tone="caution">
        <Text size={1}>Add at least two products to see bundle pricing</Text>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card padding={3} radius={2} shadow={1}>
        <Stack space={3}>
          <Spinner />
          <Text size={1}>Loading bundle summary...</Text>
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding={3} radius={2} shadow={1} tone="critical">
        <Text size={1}>{error}</Text>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const componentSum = rows.reduce(
    (sum, r) => sum + (r.price ?? 0) * r.quantity,
    0,
  );
  const hasPrice = typeof bundlePrice === 'number' && bundlePrice > 0;
  const savings = hasPrice ? componentSum - bundlePrice : 0;
  const savingsPct =
    hasPrice && componentSum > 0 ? (savings / componentSum) * 100 : 0;

  // How many complete bundles current stock supports
  const stockKnown = rows.every((r) => typeof r.stock === 'number');
  const maxBundles = stockKnown
    ? Math.min(...rows.map((r) => Math.floor((r.stock as number) / r.quantity)))
    : null;

  const savingsTone =
    savings > 0 ? 'positive' : savings < 0 ? 'critical' : 'default';

  return (
    <Card padding={4} radius={2} shadow={1} style={{ border: '2px solid #4f46e5' }}>
      <Stack space={4}>
        <Stack space={2}>
          <Text size={1} weight="bold" style={{ color: '#4f46e5' }}>
            BUNDLE SUMMARY
          </Text>
          <Text size={1} muted>
            Bundles hold no stock of their own - each product below is deducted
            separately when an order is paid.
          </Text>
        </Stack>

        {/* Components */}
        <Stack space={2}>
          {rows.map((r) => (
            <Flex key={r._id} align="center" justify="space-between" gap={2}>
              <Box flex={1}>
                <Text size={1}>
                  {r.quantity > 1 ? `${r.quantity}x ` : ''}
                  {r.name}
                </Text>
              </Box>
              <Flex align="center" gap={2}>
                <Text size={1} muted>
                  {r.price != null
                    ? `$${(r.price * r.quantity).toFixed(2)}`
                    : 'no price'}
                </Text>
                <Badge
                  tone={
                    r.stock == null
                      ? 'default'
                      : r.stock === 0
                        ? 'critical'
                        : r.stock < 5
                          ? 'caution'
                          : 'positive'
                  }
                >
                  {r.stock == null ? 'stock ?' : `${r.stock} in stock`}
                </Badge>
              </Flex>
            </Flex>
          ))}
        </Stack>

        {/* Pricing */}
        <Card padding={3} radius={2} tone="transparent">
          <Stack space={3}>
            <Flex align="center" justify="space-between">
              <Text size={1}>Bought separately</Text>
              <Text size={1} weight="semibold">
                ${componentSum.toFixed(2)}
              </Text>
            </Flex>
            <Flex align="center" justify="space-between">
              <Text size={1}>Bundle price</Text>
              <Text size={1} weight="semibold">
                {hasPrice ? `$${bundlePrice.toFixed(2)}` : 'not set'}
              </Text>
            </Flex>
            {hasPrice && (
              <Flex align="center" justify="space-between">
                <Text size={1} weight="bold">
                  {savings >= 0 ? 'Customer saves' : 'Bundle costs MORE'}
                </Text>
                <Badge tone={savingsTone} padding={2}>
                  {savings >= 0
                    ? `$${savings.toFixed(2)} (${savingsPct.toFixed(0)}% off)`
                    : `+$${Math.abs(savings).toFixed(2)}`}
                </Badge>
              </Flex>
            )}
          </Stack>
        </Card>

        {savings < 0 && hasPrice && (
          <Card padding={3} radius={2} tone="critical">
            <Text size={1}>
              This bundle is priced above the cost of buying the items
              separately.
            </Text>
          </Card>
        )}

        {/* Fulfillable count */}
        <Flex align="center" justify="space-between">
          <Text size={1} muted>
            Complete bundles stock can fulfil
          </Text>
          <Badge
            tone={
              maxBundles == null
                ? 'default'
                : maxBundles === 0
                  ? 'critical'
                  : maxBundles < 5
                    ? 'caution'
                    : 'positive'
            }
            padding={2}
          >
            {maxBundles == null ? 'unknown' : maxBundles}
          </Badge>
        </Flex>
      </Stack>
    </Card>
  );
}
