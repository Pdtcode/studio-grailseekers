import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Checkbox,
  Container,
  Flex,
  Stack,
  Text,
  Badge,
  Button,
} from '@sanity/ui';
import { useListeningQuery } from 'sanity';
import { formatDistanceToNow } from 'date-fns';
import BulkOrderActions from './BulkOrderActions';

interface OrderListViewProps {
  filter?: string;
  title: string;
}

interface Order {
  _id: string;
  _rev: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  PENDING: 'yellow',
  PROCESSING: 'blue',
  SHIPPED: 'purple',
  DELIVERED: 'positive',
  CANCELLED: 'critical',
} as const;

const OrderListView: React.FC<OrderListViewProps> = ({ filter = '', title }) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>();
  const [shouldRefresh, setShouldRefresh] = useState(0);

  // Build the GROQ query
  const query = useMemo(() => {
    const baseQuery = '*[_type == "order"';
    const filterQuery = filter ? ` && ${filter}` : '';
    const sortQuery = '] | order(createdAt desc)';

    return `${baseQuery}${filterQuery}${sortQuery}`;
  }, [filter]);

  const { data: orders = [], loading, error } = useListeningQuery<Order[]>(
    query,
    {},
    { tag: `order-list-${shouldRefresh}` }
  );

  const handleSelectionChange = (orderIds: string[]) => {
    setSelectedOrderIds(orderIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(orders.map(order => order._id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...(prev || []), orderId]);
    } else {
      setSelectedOrderIds(prev => (prev || []).filter(id => id !== orderId));
    }
  };

  const handleAction = () => {
    // Force a refresh by incrementing the tag
    setShouldRefresh(prev => prev + 1);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds?.length === orders.length;
  const isSomeSelected = (selectedOrderIds?.length || 0) > 0;

  if (loading) {
    return (
      <Container width={1}>
        <Box padding={4}>
          <Text>Loading orders...</Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container width={1}>
        <Box padding={4}>
          <Text tone="critical">Error loading orders: {error.message}</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container width={1}>
      <Stack space={4}>
        {/* Header with bulk selection */}
        <Card padding={4}>
          <Flex align="center" gap={3}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected && !isAllSelected}
              onChange={(event) => handleSelectAll(event.currentTarget.checked)}
            />
            <Text weight="medium" size={2}>
              {title} ({orders.length})
            </Text>
          </Flex>
        </Card>

        {/* Bulk Actions */}
        <BulkOrderActions
          selectedOrderIds={selectedOrderIds || []}
          onSelectionChange={handleSelectionChange}
          onAction={handleAction}
        />

        {/* Orders List */}
        <Stack space={2}>
          {orders.length === 0 ? (
            <Card padding={4} tone="transparent">
              <Text muted>No orders found</Text>
            </Card>
          ) : (
            orders.map((order) => (
              <Card
                key={order._id}
                padding={3}
                tone={selectedOrderIds?.includes(order._id) ? 'primary' : 'default'}
                shadow={1}
              >
                <Flex align="center" gap={3}>
                  <Checkbox
                    checked={selectedOrderIds?.includes(order._id) || false}
                    onChange={(event) =>
                      handleSelectOrder(order._id, event.currentTarget.checked)
                    }
                  />

                  <Flex flex={1} align="center" justify="space-between">
                    <Stack space={2} flex={1}>
                      <Flex align="center" gap={2}>
                        <Text weight="medium">{order.orderNumber}</Text>
                        <Badge
                          tone={statusColors[order.status as keyof typeof statusColors] || 'default'}
                          mode="outline"
                        >
                          {order.status}
                        </Badge>
                      </Flex>

                      <Flex gap={4} wrap="wrap">
                        {order.customerName && (
                          <Text size={1} muted>
                            <strong>Customer:</strong> {order.customerName}
                          </Text>
                        )}
                        {order.customerEmail && (
                          <Text size={1} muted>
                            <strong>Email:</strong> {order.customerEmail}
                          </Text>
                        )}
                        <Text size={1} muted>
                          <strong>Total:</strong> ${order.total?.toFixed(2)}
                        </Text>
                        <Text size={1} muted>
                          <strong>Created:</strong> {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </Text>
                      </Flex>
                    </Stack>

                    <Button
                      text="Edit"
                      mode="ghost"
                      as="a"
                      href={`/intent/edit/id=${order._id};type=order/`}
                      target="_blank"
                    />
                  </Flex>
                </Flex>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Container>
  );
};

export default OrderListView;