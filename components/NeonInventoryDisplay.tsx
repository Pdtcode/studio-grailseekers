import React, { useEffect, useState } from 'react';
import { Card, Stack, Text, Badge, Spinner, Box, Flex } from '@sanity/ui';
import { useFormValue } from 'sanity';

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

/**
 * Custom Sanity Studio component that displays real-time inventory from Neon database
 * Shows the actual inventory count (source of truth) alongside Sanity's UI fields
 */
export function NeonInventoryDisplay() {
  const slug = useFormValue(['slug', 'current']) as string | undefined;
  const [inventoryData, setInventoryData] = useState<NeonInventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setInventoryData(null);
      return;
    }

    const fetchNeonInventory = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use production URL by default, fallback to localhost for local dev
        const baseUrl = process.env.SANITY_STUDIO_API_URL || 'https://gsdesignresearch.com';
        const response = await fetch(`${baseUrl}/api/neon-inventory?slug=${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Product not found in Neon database');
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setInventoryData(data);
      } catch (err) {
        console.error('Error fetching Neon inventory:', err);
        setError('Failed to fetch inventory from Neon');
      } finally {
        setLoading(false);
      }
    };

    fetchNeonInventory();
  }, [slug]);

  if (!slug) {
    return (
      <Card padding={3} radius={2} shadow={1} tone="caution">
        <Text size={1}>
          💡 Save the product with a slug to view Neon inventory
        </Text>
      </Card>
    );
  }

  if (loading) {
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

  const getLowStockTone = (stock: number): 'positive' | 'caution' | 'critical' => {
    if (stock === 0) return 'critical';
    if (stock < 5) return 'caution';
    return 'positive';
  };

  return (
    <Card padding={4} radius={2} shadow={1} tone="default" style={{ border: '2px solid #4f46e5' }}>
      <Stack space={3}>
        <Stack space={2}>
          <Text size={1} weight="bold" style={{ color: '#4f46e5' }}>
            📊 NEON DATABASE INVENTORY (Source of Truth)
          </Text>
          <Text size={1} muted>
            This is the real-time inventory count from your database
          </Text>
        </Stack>

        <Box paddingTop={2}>
          <Stack space={3}>
            {/* Total Stock */}
            <Card padding={3} radius={2} tone={getLowStockTone(inventoryData.totalStock)}>
              <Stack space={2}>
                <Text size={2} weight="bold">
                  Total Stock: {inventoryData.totalStock} units
                </Text>
              </Stack>
            </Card>

            {/* Variant Breakdown */}
            {inventoryData.variants && inventoryData.variants.length > 0 && (
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Variant Breakdown:
                </Text>
                <Stack space={2}>
                  {inventoryData.variants.map((variant) => (
                    <Card
                      key={variant.sku}
                      padding={2}
                      radius={2}
                      tone={getLowStockTone(variant.stock)}
                    >
                      <Flex align="center" justify="space-between">
                        <Stack space={1}>
                          <Text size={1} weight="medium">
                            {variant.size} {variant.color && `- ${variant.color}`}
                          </Text>
                          <Text size={0} muted>
                            SKU: {variant.sku}
                          </Text>
                        </Stack>
                        <Badge tone={getLowStockTone(variant.stock)} fontSize={1}>
                          {variant.stock} in stock
                        </Badge>
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </Box>

        <Card padding={2} radius={1} tone="transparent" style={{ borderTop: '1px solid #e5e7eb' }}>
          <Text size={0} muted>
            💡 Update inventory in Sanity and save to sync to Neon database
          </Text>
        </Card>
      </Stack>
    </Card>
  );
}
