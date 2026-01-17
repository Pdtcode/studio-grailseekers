import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@sanity/ui';
import { SyncIcon } from '@sanity/icons';

// Get API URL from environment variable, fallback to production
const API_BASE_URL = import.meta.env.SANITY_STUDIO_API_URL || "https://gsdesignresearch.com";

const ProductSyncTool = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const toast = useToast();

  const syncProducts = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncResult(null);

      console.log('=== PRODUCT SYNC DEBUG INFO ===');
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Timestamp:', new Date().toISOString());

      // Call the sync-inventory endpoint
      const response = await fetch(`${API_BASE_URL}/api/sync-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Sync all products
      });

      console.log('Response status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        setSyncResult(result);
        console.log('Parsed result:', result);

        toast.push({
          status: 'success',
          title: 'Product sync completed',
          description: `Processed ${result.totalProcessed || 0} products successfully`,
        });
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }

        console.error('Sync failed:', errorData);
        toast.push({
          status: 'error',
          title: 'Product sync failed',
          description: errorData.message || 'Unknown error occurred',
        });
      }
    } catch (error) {
      console.error('Product sync error:', error);
      toast.push({
        status: 'error',
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Flex align="flex-start" direction="column" padding={4}>
      <Box marginBottom={5}>
        <Heading size={2}>Product Sync Tool</Heading>
        <Box marginTop={3}>
          <Text>
            Manually sync products from Sanity to your Neon database. This will create new products
            and update existing ones with the latest prices, descriptions, and inventory.
          </Text>
        </Box>
      </Box>

      <Card padding={4} radius={2} shadow={1} tone="primary">
        <Stack space={4}>
          <Box>
            <Heading size={1}>Sync All Products</Heading>
            <Box marginTop={2}>
              <Text>
                This will sync all products from Sanity to your database, including:
              </Text>
              <Box marginTop={2} marginLeft={3}>
                <Text size={1}>• Product names, descriptions, and prices</Text>
                <Text size={1}>• Product variants and inventory levels</Text>
                <Text size={1}>• Images and metadata</Text>
              </Box>
            </Box>
          </Box>

          <Button
            disabled={isSyncing}
            icon={isSyncing ? Spinner : SyncIcon}
            text={isSyncing ? "Syncing Products..." : "Sync Products to Database"}
            tone="primary"
            onClick={syncProducts}
          />

          {syncResult && (
            <Card
              padding={3}
              radius={2}
              tone="positive"
            >
              <Stack space={3}>
                <Heading size={1}>Sync Results</Heading>

                <Box padding={2} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                  <Text size={1} muted>API: {API_BASE_URL}</Text>
                </Box>

                <Text>
                  ✓ Total products processed: {syncResult.totalProcessed || 0}
                </Text>

                {syncResult.results && syncResult.results.length > 0 && (
                  <Box>
                    <Text weight="semibold" marginBottom={2}>Product Details:</Text>
                    <Stack space={2}>
                      {syncResult.results.slice(0, 10).map((result: any, index: number) => (
                        <Box key={index} padding={2} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '4px' }}>
                          <Text size={1}>
                            <strong>{result.productName}</strong> - {result.action}
                            {result.variantSku && <span> (SKU: {result.variantSku})</span>}
                            {result.quantity !== undefined && <span> • Stock: {result.quantity}</span>}
                          </Text>
                        </Box>
                      ))}
                      {syncResult.results.length > 10 && (
                        <Text size={1} muted>
                          ...and {syncResult.results.length - 10} more products
                        </Text>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      <Box marginTop={4}>
        <Card padding={3} tone="transparent">
          <Text size={1} muted>
            <strong>Note:</strong> This tool manually syncs products. For automatic syncing when you publish
            products, you'll need to configure webhooks in your Sanity project settings pointing to
            your website's API endpoint.
          </Text>
        </Card>
      </Box>
    </Flex>
  );
};

export default ProductSyncTool;