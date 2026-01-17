import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Select,
  Stack,
  Text,
  useToast,
  Spinner,
} from '@sanity/ui';
import { TrashIcon, EditIcon } from '@sanity/icons';
import { useClient } from 'sanity';

interface BulkOrderActionsProps {
  selectedOrderIds: string[];
  onSelectionChange: (orderIds: string[]) => void;
  onAction?: () => void;
}

const BulkOrderActions: React.FC<BulkOrderActionsProps> = ({
  selectedOrderIds,
  onSelectionChange,
  onAction,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const toast = useToast();
  const client = useClient({ apiVersion: '2023-05-03' });

  const orderStatuses = [
    { title: 'Pending', value: 'PENDING' },
    { title: 'Processing', value: 'PROCESSING' },
    { title: 'Shipped', value: 'SHIPPED' },
    { title: 'Delivered', value: 'DELIVERED' },
    { title: 'Cancelled', value: 'CANCELLED' },
  ];

  const handleBulkDelete = async () => {
    if (!selectedOrderIds.length) return;

    setIsProcessing(true);
    try {
      // Delete orders in parallel
      const deletePromises = selectedOrderIds.map(orderId =>
        client.delete(orderId)
      );

      await Promise.all(deletePromises);

      toast.push({
        status: 'success',
        title: 'Orders deleted',
        description: `Successfully deleted ${selectedOrderIds.length} order(s)`,
      });

      onSelectionChange([]);
      setShowDeleteConfirm(false);
      onAction?.();
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast.push({
        status: 'error',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedOrderIds.length || !newStatus) return;

    setIsProcessing(true);
    try {
      // Update status for all selected orders in parallel
      const updatePromises = selectedOrderIds.map(orderId =>
        client
          .patch(orderId)
          .set({
            status: newStatus,
            updatedAt: new Date().toISOString()
          })
          .commit()
      );

      await Promise.all(updatePromises);

      const statusTitle = orderStatuses.find(s => s.value === newStatus)?.title || newStatus;

      toast.push({
        status: 'success',
        title: 'Status updated',
        description: `Updated ${selectedOrderIds.length} order(s) to ${statusTitle}`,
      });

      onSelectionChange([]);
      setShowStatusUpdate(false);
      setNewStatus('');
      onAction?.();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.push({
        status: 'error',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedOrderIds.length) {
    return null;
  }

  return (
    <>
      <Card padding={3} tone="primary" shadow={1}>
        <Flex align="center" gap={3}>
          <Text weight="medium">
            {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''} selected
          </Text>

          <Button
            icon={EditIcon}
            text="Update Status"
            tone="positive"
            onClick={() => setShowStatusUpdate(true)}
            disabled={isProcessing}
          />

          <Button
            icon={TrashIcon}
            text="Delete"
            tone="critical"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isProcessing}
          />

          <Button
            text="Clear Selection"
            mode="ghost"
            onClick={() => onSelectionChange([])}
          />
        </Flex>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog
          header="Delete Orders"
          id="bulk-delete-dialog"
          onClose={() => setShowDeleteConfirm(false)}
          footer={
            <Box padding={3}>
              <Flex gap={2} justify="flex-end">
                <Button
                  text="Cancel"
                  mode="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                />
                <Button
                  text={isProcessing ? 'Deleting...' : 'Delete'}
                  tone="critical"
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                  icon={isProcessing ? Spinner : TrashIcon}
                />
              </Flex>
            </Box>
          }
        >
          <Box padding={4}>
            <Stack space={3}>
              <Text>
                Are you sure you want to delete {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''}?
              </Text>
              <Text size={1} muted>
                This action cannot be undone. The orders will be permanently removed from Sanity.
              </Text>
            </Stack>
          </Box>
        </Dialog>
      )}

      {/* Status Update Dialog */}
      {showStatusUpdate && (
        <Dialog
          header="Update Order Status"
          id="bulk-status-dialog"
          onClose={() => setShowStatusUpdate(false)}
          footer={
            <Box padding={3}>
              <Flex gap={2} justify="flex-end">
                <Button
                  text="Cancel"
                  mode="ghost"
                  onClick={() => setShowStatusUpdate(false)}
                  disabled={isProcessing}
                />
                <Button
                  text={isProcessing ? 'Updating...' : 'Update'}
                  tone="positive"
                  onClick={handleBulkStatusUpdate}
                  disabled={isProcessing || !newStatus}
                  icon={isProcessing ? Spinner : EditIcon}
                />
              </Flex>
            </Box>
          }
        >
          <Box padding={4}>
            <Stack space={4}>
              <Text>
                Update status for {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''}:
              </Text>

              <Select
                placeholder="Select new status"
                value={newStatus}
                onChange={(event) => setNewStatus(event.currentTarget.value)}
              >
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.title}
                  </option>
                ))}
              </Select>

              <Text size={1} muted>
                This will update the status and updatedAt timestamp for all selected orders.
              </Text>
            </Stack>
          </Box>
        </Dialog>
      )}
    </>
  );
};

export default BulkOrderActions;