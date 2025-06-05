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
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<any>(null);
  const [lastSyncTimeAgo, setLastSyncTimeAgo] = useState<string | null>(null);
  const toast = useToast();
  const client = useClient({ apiVersion: "2023-05-03" });

  // Fetch the last sync info when the component mounts
  useEffect(() => {
    const fetchLastSyncInfo = async () => {
      try {
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
    }, 60000);

    return () => clearInterval(intervalId);
  }, [client, lastSyncInfo?.lastSyncTime]);

  const syncOrders = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncResult(null);

      // Call the API endpoint to perform the sync
      // Use environment variable or fallback to localhost
      const apiUrl = "https://grailseekers.netlify.app/api/sync-orders"
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed with status ${response.status}: ${errorText}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        throw new Error('API returned 204 No Content - check if the endpoint is correct');
      }

      const result = await response.json();

      setSyncResult(result);

      // Refresh the last sync info
      try {
        const syncState = await client.fetch(
          `*[_type == "syncState" && key == "orders"][0]`,
        );

        setLastSyncInfo(syncState);

        if (syncState?.lastSyncTime) {
          const timeAgo = formatDistanceToNow(
            new Date(syncState.lastSyncTime),
            { addSuffix: true },
          );

          setLastSyncTimeAgo(timeAgo);
        }
      } catch (error) {
        console.error("Error fetching updated sync info:", error);
      }

      console.log('Sync result:', result);
      
      // Show a success toast
      toast.push({
        status: "success",
        title: "Orders synced successfully",
        description: `Created: ${result.stats?.created || 0}, Updated: ${result.stats?.updated || 0}, Errors: ${result.stats?.errors || 0}`,
      });
    } catch (error) {
      console.error("Error syncing orders:", error);

      // Show an error toast
      toast.push({
        status: "error",
        title: "Order sync failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Flex align="flex-start" direction="column" padding={4}>
      <Box marginBottom={5}>
        <Heading size={2}>Order Sync Tool</Heading>
        <Box marginTop={3}>
          <Text>
            This tool synchronizes orders from your database to Sanity. Use this
            after making changes to orders outside of Sanity or if you notice
            that the orders are out of sync.
          </Text>
        </Box>
        {lastSyncTimeAgo && (
          <Box marginTop={2}>
            <Text muted size={1}>
              {`Last synced: ${lastSyncTimeAgo} • Status: `}
              <span
                style={{
                  color:
                    lastSyncInfo?.syncStatus === "success" ? "green" : "red",
                }}
              >
                {lastSyncInfo?.syncStatus === "success" ? "Success" : "Failed"}
              </span>
              {lastSyncInfo?.syncStats && (
                <span>{` • Created: ${lastSyncInfo.syncStats.created}, Updated: ${lastSyncInfo.syncStats.updated}`}</span>
              )}
            </Text>
          </Box>
        )}
      </Box>

      <Card padding={4} radius={2} shadow={1} tone="primary">
        <Stack space={4}>
          <Box>
            <Heading size={1}>Sync Orders</Heading>
            <Box marginTop={2}>
              <Text>
                Click the button below to sync all orders from your database to
                Sanity. This process may take a few moments depending on the
                number of orders.
              </Text>
            </Box>
          </Box>

          <Button
            disabled={isSyncing}
            icon={isSyncing ? Spinner : undefined}
            text={isSyncing ? "Syncing..." : "Sync All Orders"}
            tone="primary"
            onClick={syncOrders}
          />

          {syncResult && (
            <Card
              padding={3}
              radius={2}
              tone={syncResult.success ? "positive" : "critical"}
            >
              <Stack space={3}>
                <Heading size={1}>
                  Sync{" "}
                  {syncResult.success ? "Completed" : "Failed"}
                </Heading>

                {syncResult.success ? (
                  <Stack space={2}>
                    <Text>Orders processed: {syncResult.stats?.total || 0}</Text>
                    <Text>Created: {syncResult.stats?.created || 0}</Text>
                    <Text>Updated: {syncResult.stats?.updated || 0}</Text>
                    <Text>Errors: {syncResult.stats?.errors || 0}</Text>
                  </Stack>
                ) : (
                  <Text>
                    {syncResult.message || "An unknown error occurred"}
                  </Text>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>
    </Flex>
  );
};

export default OrderSyncTool;
