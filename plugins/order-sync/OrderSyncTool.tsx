import React, { useState, useEffect } from "react";
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
} from "@sanity/ui";
import { useClient } from "sanity";
import { formatDistanceToNow } from "date-fns";

/**
 * A Sanity Studio tool that provides a UI for syncing orders from the database to Sanity
 */
const OrderSyncTool = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<any>(null);
  const [lastSyncTimeAgo, setLastSyncTimeAgo] = useState<string | null>(null);
  const [lastSanityToDbInfo, setLastSanityToDbInfo] = useState<any>(null);
  const [lastSanityToDbTimeAgo, setLastSanityToDbTimeAgo] = useState<string | null>(null);
  const [lastWebhookInfo, setLastWebhookInfo] = useState<any>(null);
  const [lastWebhookTimeAgo, setLastWebhookTimeAgo] = useState<string | null>(null);
  const toast = useToast();
  const client = useClient({ apiVersion: "2023-05-03" });

  // Fetch the last sync info when the component mounts
  useEffect(() => {
    const fetchLastSyncInfo = async () => {
      try {
        // Fetch DB to Sanity sync info
        const syncState = await client.fetch(
          `*[_type == "syncState" && key == "order-sync"][0]`,
        );

        setLastSyncInfo(syncState);

        if (syncState?.lastSyncTime) {
          const timeAgo = formatDistanceToNow(
            new Date(syncState.lastSyncTime),
            { addSuffix: true },
          );

          setLastSyncTimeAgo(timeAgo);
        }

        // Fetch Sanity to DB sync info
        const sanityToDbState = await client.fetch(
          `*[_type == "syncState" && key == "sanity-to-db"][0]`,
        );

        setLastSanityToDbInfo(sanityToDbState);

        if (sanityToDbState?.lastSyncTime) {
          const timeAgo = formatDistanceToNow(
            new Date(sanityToDbState.lastSyncTime),
            { addSuffix: true },
          );

          setLastSanityToDbTimeAgo(timeAgo);
        }

        // Fetch webhook sync info
        const webhookState = await client.fetch(
          `*[_type == "syncState" && key == "webhook-order-status"][0]`,
        );

        setLastWebhookInfo(webhookState);

        if (webhookState?.lastSyncTime) {
          const timeAgo = formatDistanceToNow(
            new Date(webhookState.lastSyncTime),
            { addSuffix: true },
          );

          setLastWebhookTimeAgo(timeAgo);
        }
      } catch (error) {
        console.error("Error fetching last sync info:", error);
      }
    };

    fetchLastSyncInfo();

    // Update the "time ago" display every minute
    const intervalId = setInterval(() => {
      if (lastSyncInfo?.lastSyncTime) {
        const timeAgo = formatDistanceToNow(
          new Date(lastSyncInfo.lastSyncTime),
          { addSuffix: true },
        );

        setLastSyncTimeAgo(timeAgo);
      }

      if (lastSanityToDbInfo?.lastSyncTime) {
        const timeAgo = formatDistanceToNow(
          new Date(lastSanityToDbInfo.lastSyncTime),
          { addSuffix: true },
        );

        setLastSanityToDbTimeAgo(timeAgo);
      }

      if (lastWebhookInfo?.lastSyncTime) {
        const timeAgo = formatDistanceToNow(
          new Date(lastWebhookInfo.lastSyncTime),
          { addSuffix: true },
        );

        setLastWebhookTimeAgo(timeAgo);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [client, lastSyncInfo?.lastSyncTime, lastSanityToDbInfo?.lastSyncTime, lastWebhookInfo?.lastSyncTime]);

  const syncOrders = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncResult(null);

      const results = {
        dbToSanity: null as any,
        sanityToDb: null as any,
        combinedStats: {
          dbToSanity: { created: 0, updated: 0, errors: 0, total: 0 },
          sanityToDb: { created: 0, updated: 0, errors: 0, total: 0 }
        }
      };

      // Step 1: Sync from Sanity to Database (update existing order statuses first)
      console.log('Starting Sanity → DB sync...');
      try {
        const sanityToDbResponse = await fetch("https://grailseekers.netlify.app/api/sync-from-sanity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (sanityToDbResponse.ok) {
          results.sanityToDb = await sanityToDbResponse.json();
          results.combinedStats.sanityToDb = results.sanityToDb.stats;
          console.log('Sanity → DB sync completed:', results.sanityToDb);
        } else {
          throw new Error(`Sanity → DB sync failed: ${sanityToDbResponse.status}`);
        }
      } catch (error) {
        console.error('Sanity → DB sync failed:', error);
        results.combinedStats.sanityToDb.errors = 1;
      }

      // Step 2: Sync from Database to Sanity (pull new orders)
      console.log('Starting DB → Sanity sync...');
      try {
        const dbToSanityResponse = await fetch("https://grailseekers.netlify.app/api/sync-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (dbToSanityResponse.ok) {
          results.dbToSanity = await dbToSanityResponse.json();
          results.combinedStats.dbToSanity = results.dbToSanity.stats;
          console.log('DB → Sanity sync completed:', results.dbToSanity);
        } else {
          throw new Error(`DB → Sanity sync failed: ${dbToSanityResponse.status}`);
        }
      } catch (error) {
        console.error('DB → Sanity sync failed:', error);
        results.combinedStats.dbToSanity.errors = 1;
      }

      setSyncResult(results);

      // Refresh sync info for both directions
      try {
        const [syncState, sanityToDbState] = await Promise.all([
          client.fetch(`*[_type == "syncState" && key == "order-sync"][0]`),
          client.fetch(`*[_type == "syncState" && key == "sanity-to-db"][0]`)
        ]);

        setLastSyncInfo(syncState);
        setLastSanityToDbInfo(sanityToDbState);

        if (syncState?.lastSyncTime) {
          setLastSyncTimeAgo(formatDistanceToNow(new Date(syncState.lastSyncTime), { addSuffix: true }));
        }
        if (sanityToDbState?.lastSyncTime) {
          setLastSanityToDbTimeAgo(formatDistanceToNow(new Date(sanityToDbState.lastSyncTime), { addSuffix: true }));
        }
      } catch (error) {
        console.error("Error fetching updated sync info:", error);
      }

      // Show comprehensive success toast
      const totalErrors = results.combinedStats.dbToSanity.errors + results.combinedStats.sanityToDb.errors;
      toast.push({
        status: totalErrors > 0 ? "warning" : "success",
        title: "Bidirectional sync completed",
        description: `Sanity→DB: +${results.combinedStats.sanityToDb.created} ~${results.combinedStats.sanityToDb.updated} | DB→Sanity: +${results.combinedStats.dbToSanity.created} ~${results.combinedStats.dbToSanity.updated} | Errors: ${totalErrors}`,
      });

    } catch (error) {
      console.error("Error during bidirectional sync:", error);

      toast.push({
        status: "error",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const exportProcessingOrders = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      console.log('Starting CSV export of processing orders...');
      
      const response = await fetch("https://grailseekers.netlify.app/api/export-processing-orders", {
        method: "GET",
        headers: {
          "Accept": "text/csv",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.push({
            status: "warning",
            title: "No processing orders found",
            description: "There are currently no orders with 'PROCESSING' status to export.",
          });
          return;
        }
        
        const errorText = await response.text();
        throw new Error(`Export failed with status ${response.status}: ${errorText}`);
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Get filename from response headers or create default
      const today = new Date().toISOString().split('T')[0];
      const filename = `processing-orders-${today}.csv`;
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('CSV export completed successfully');
      
      toast.push({
        status: "success",
        title: "Processing orders exported",
        description: `Downloaded ${filename} with customer names and shipping addresses.`,
      });

    } catch (error) {
      console.error("Error exporting processing orders:", error);

      toast.push({
        status: "error",
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Flex align="flex-start" direction="column" padding={4}>
      <Box marginBottom={5}>
        <Heading size={2}>Order Sync Tool</Heading>
        <Box marginTop={3}>
          <Text>
            Manual sync for new orders and revalidation. Order status changes are automatically
            synced via webhooks - you only need to use this button to pull new orders from your database.
          </Text>
        </Box>
        {(lastSyncTimeAgo || lastSanityToDbTimeAgo || lastWebhookTimeAgo) && (
          <Box marginTop={2}>
            {lastWebhookTimeAgo && (
              <Text muted size={1}>
                {`🔄 Auto Status Sync: ${lastWebhookTimeAgo} (${lastWebhookInfo?.syncStatus === "success" ? "✓" : "✗"})`}
                {lastWebhookInfo?.lastOrderId && (
                  <span>{` • Last: Order ${lastWebhookInfo.lastOrderId} → ${lastWebhookInfo.lastStatus || 'unknown'}`}</span>
                )}
              </Text>
            )}
            {lastSyncTimeAgo && (
              <Text muted size={1}>
                {`📥 Manual DB → Sanity: ${lastSyncTimeAgo} (${lastSyncInfo?.syncStatus === "success" ? "✓" : "✗"})`}
                {lastSyncInfo?.syncStats && (
                  <span>{` • +${lastSyncInfo.syncStats.created} ~${lastSyncInfo.syncStats.updated}`}</span>
                )}
              </Text>
            )}
            {lastSanityToDbTimeAgo && (
              <Text muted size={1}>
                {`📤 Manual Sanity → DB: ${lastSanityToDbTimeAgo} (${lastSanityToDbInfo?.syncStatus === "success" ? "✓" : "✗"})`}
                {lastSanityToDbInfo?.syncStats && (
                  <span>{` • +${lastSanityToDbInfo.syncStats.created} ~${lastSanityToDbInfo.syncStats.updated}`}</span>
                )}
              </Text>
            )}
          </Box>
        )}
      </Box>

      <Card padding={4} radius={2} shadow={1} tone="primary">
        <Stack space={4}>
          <Box>
            <Heading size={1}>Manual Sync</Heading>
            <Box marginTop={2}>
              <Text>
                First pushes any order status changes from Sanity to your database, 
                then pulls new orders from your database to Sanity. Order status changes 
                are also handled automatically via webhooks.
              </Text>
            </Box>
          </Box>

          <Button
            disabled={isSyncing}
            icon={isSyncing ? Spinner : undefined}
            text={isSyncing ? "Syncing..." : "Sync New Orders"}
            tone="primary"
            onClick={syncOrders}
          />

          {syncResult && (
            <Card
              padding={3}
              radius={2}
              tone={syncResult.dbToSanity?.success && syncResult.sanityToDb?.success ? "positive" : "caution"}
            >
              <Stack space={3}>
                <Heading size={1}>Sync Results</Heading>
                
                <Stack space={2}>
                  <Text weight="semibold">Step 1 - Sanity → Database:</Text>
                  {syncResult.sanityToDb ? (
                    <Text>
                      ✓ Created: {syncResult.combinedStats.sanityToDb.created}, 
                      Updated: {syncResult.combinedStats.sanityToDb.updated}, 
                      Errors: {syncResult.combinedStats.sanityToDb.errors}
                    </Text>
                  ) : (
                    <Text>✗ Failed to sync</Text>
                  )}
                  
                  <Text weight="semibold">Step 2 - Database → Sanity:</Text>
                  {syncResult.dbToSanity ? (
                    <Text>
                      ✓ Created: {syncResult.combinedStats.dbToSanity.created}, 
                      Updated: {syncResult.combinedStats.dbToSanity.updated}, 
                      Errors: {syncResult.combinedStats.dbToSanity.errors}
                    </Text>
                  ) : (
                    <Text>✗ Failed to sync</Text>
                  )}
                </Stack>
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      <Card padding={4} radius={2} shadow={1} tone="positive" marginTop={4}>
        <Stack space={4}>
          <Box>
            <Heading size={1}>Export Processing Orders</Heading>
            <Box marginTop={2}>
              <Text>
                Download a CSV file containing customer names and shipping addresses 
                for all orders with &quot;PROCESSING&quot; status. Perfect for shipping and fulfillment.
              </Text>
            </Box>
          </Box>

          <Button
            disabled={isExporting || isSyncing}
            icon={isExporting ? Spinner : undefined}
            text={isExporting ? "Exporting..." : "Download CSV"}
            tone="positive"
            onClick={exportProcessingOrders}
          />
        </Stack>
      </Card>
    </Flex>
  );
};

export default OrderSyncTool;
