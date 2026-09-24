import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Grid,
  Heading,
  Select,
  Stack,
  Tab,
  TabList,
  Text,
  TextInput,
  useToast,
} from '@sanity/ui';
import { CopyIcon, LaunchIcon, RefreshIcon, SearchIcon } from '@sanity/icons';
import { useClient } from 'sanity';
import { format, formatDistanceToNow } from 'date-fns';
import BulkOrderActions from './BulkOrderActions';
import ExportProcessingOrdersButton from './ExportProcessingOrdersButton';

interface OrderListViewProps {
  filter?: string;
  title: string;
}

interface OrderItem {
  _key: string;
  name?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity?: number;
  price?: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  status: string;
  createdAt: string;
  items?: OrderItem[];
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingApartment?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  deliveryMethod?: 'shipping' | 'pickup' | 'inperson';
  pickupLocationName?: string;
  stripePaymentIntentId?: string;
  notes?: string;
}

const STATUSES = [
  { value: 'PROCESSING', title: 'Processing', tone: 'primary' },
  { value: 'SHIPPED', title: 'Shipped', tone: 'suggest' },
  { value: 'DELIVERED', title: 'Delivered', tone: 'positive' },
  { value: 'CANCELLED', title: 'Cancelled', tone: 'critical' },
  { value: 'PENDING', title: 'Pending', tone: 'caution' },
] as const;

type StatusTone = (typeof STATUSES)[number]['tone'];

const statusTone = (status: string): StatusTone | 'default' =>
  STATUSES.find((s) => s.value === status)?.tone ?? 'default';

const money = (value?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);

// Orders placed before delivery methods existed have none — they were all shipped
const deliveryLabel = (order: Order) =>
  order.deliveryMethod === 'pickup'
    ? 'Pickup'
    : order.deliveryMethod === 'inperson'
      ? 'In person'
      : 'Shipping';

const itemCount = (order: Order) =>
  (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 1), 0);

function addressLines(order: Order): string[] {
  const name = [order.shippingFirstName, order.shippingLastName].filter(Boolean).join(' ');
  const street = [order.shippingAddress, order.shippingApartment].filter(Boolean).join(', ');
  const cityLine = [order.shippingCity, [order.shippingState, order.shippingZipCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return [name, street, cityLine, order.shippingCountry].filter((line): line is string => !!line);
}

const ORDER_FIELDS = `
  _id, orderNumber, customerName, customerEmail, total, status, createdAt,
  items[]{_key, name, sku, color, size, quantity, price},
  shippingFirstName, shippingLastName, shippingEmail, shippingPhone,
  shippingAddress, shippingApartment, shippingCity, shippingState, shippingZipCode, shippingCountry,
  deliveryMethod, pickupLocationName, stripePaymentIntentId, notes
`;

/** Order Manager: search, filter by status, and see each order in full. */
const OrderListView: React.FC<OrderListViewProps> = ({ filter = '', title }) => {
  const client = useClient({ apiVersion: '2023-05-03' });
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = `*[_type == "order" && !(_id in path("drafts.**"))${filter ? ` && ${filter}` : ''}] | order(createdAt desc){${ORDER_FIELDS}}`;
      setOrders((await client.fetch<Order[]>(query)) || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  }, [client, filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (!term) return true;

      return [order.orderNumber, order.customerName, order.customerEmail, order.shippingEmail]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [orders, statusFilter, search]);

  const activeOrder = visibleOrders.find((o) => o._id === activeId) ?? visibleOrders[0] ?? null;

  const allVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((o) => selectedOrderIds.includes(o._id));

  const toggleSelected = (orderId: string, checked: boolean) =>
    setSelectedOrderIds((ids) => (checked ? [...ids, orderId] : ids.filter((id) => id !== orderId)));

  const updateStatus = async (order: Order, status: string) => {
    setSavingStatus(true);
    try {
      // The Sanity webhook copies this to the database
      await client.patch(order._id).set({ status, updatedAt: new Date().toISOString() }).commit();
      setOrders((list) => list.map((o) => (o._id === order._id ? { ...o, status } : o)));
      toast.push({
        status: 'success',
        title: `${order.orderNumber} marked ${STATUSES.find((s) => s.value === status)?.title ?? status}`,
      });
    } catch (err) {
      toast.push({
        status: 'error',
        title: 'Could not update status',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.push({ status: 'success', title: `${what} copied` });
    } catch {
      toast.push({ status: 'error', title: `Could not copy ${what.toLowerCase()}` });
    }
  };

  if (error) {
    return (
      <Box padding={4}>
        <Card padding={4} tone="critical" radius={2}>
          <Text>Error loading orders: {error.message}</Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Stack space={4}>
        {/* Header */}
        <Flex align="center" gap={3} wrap="wrap">
          <Box flex={1}>
            <Heading size={2}>{title}</Heading>
          </Box>
          <Button icon={RefreshIcon} mode="bleed" text="Refresh" disabled={loading} onClick={fetchOrders} />
          <ExportProcessingOrdersButton />
        </Flex>

        {/* Filters */}
        <Stack space={3}>
          <TabList space={1}>
            {[{ value: 'ALL', title: 'All' }, ...STATUSES].map((s) => (
              <Tab
                key={s.value}
                id={`status-${s.value}`}
                aria-controls="order-list"
                label={`${s.title} (${statusCounts[s.value] ?? 0})`}
                selected={statusFilter === s.value}
                onClick={() => setStatusFilter(s.value)}
              />
            ))}
          </TabList>
          <TextInput
            icon={SearchIcon}
            placeholder="Search by order number, name or email"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Stack>

        <BulkOrderActions
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
          onAction={fetchOrders}
        />

        <Grid columns={[1, 1, 2]} gap={4}>
          {/* Order list */}
          <Stack space={2} id="order-list">
            <Flex align="center" gap={3} paddingX={3}>
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && visibleOrders.some((o) => selectedOrderIds.includes(o._id))}
                onChange={(event) =>
                  setSelectedOrderIds(event.currentTarget.checked ? visibleOrders.map((o) => o._id) : [])
                }
              />
              <Text size={1} muted>
                {loading ? 'Loading…' : `${visibleOrders.length} order${visibleOrders.length === 1 ? '' : 's'}`}
              </Text>
            </Flex>

            {!loading && visibleOrders.length === 0 && (
              <Card padding={4} radius={2} tone="transparent" border>
                <Text muted>No orders match.</Text>
              </Card>
            )}

            {visibleOrders.map((order) => {
              const isActive = activeOrder?._id === order._id;

              return (
                <Card
                  key={order._id}
                  padding={3}
                  radius={2}
                  border
                  tone={isActive ? 'primary' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveId(order._id)}
                >
                  <Flex align="center" gap={3}>
                    <Box onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedOrderIds.includes(order._id)}
                        onChange={(event) => toggleSelected(order._id, event.currentTarget.checked)}
                      />
                    </Box>
                    <Stack space={2} flex={1}>
                      <Flex align="center" gap={2} wrap="wrap">
                        <Text weight="semibold">{order.orderNumber}</Text>
                        <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                        {order.deliveryMethod && order.deliveryMethod !== 'shipping' && (
                          <Badge mode="outline">{deliveryLabel(order)}</Badge>
                        )}
                      </Flex>
                      <Text size={1} muted textOverflow="ellipsis">
                        {order.customerName || order.customerEmail || 'Unknown customer'} · {itemCount(order)} item
                        {itemCount(order) === 1 ? '' : 's'}
                      </Text>
                    </Stack>
                    <Stack space={2} style={{ textAlign: 'right' }}>
                      <Text weight="semibold">{money(order.total)}</Text>
                      <Text size={0} muted>
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </Text>
                    </Stack>
                  </Flex>
                </Card>
              );
            })}
          </Stack>

          {/* Order detail */}
          <Box>
            {activeOrder ? (
              <OrderDetail
                order={activeOrder}
                savingStatus={savingStatus}
                onStatusChange={(status) => updateStatus(activeOrder, status)}
                onCopy={copy}
              />
            ) : (
              !loading && (
                <Card padding={4} radius={2} tone="transparent" border>
                  <Text muted>Select an order to see its details.</Text>
                </Card>
              )
            )}
          </Box>
        </Grid>
      </Stack>
    </Box>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack space={3}>
      <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function OrderDetail({
  order,
  savingStatus,
  onStatusChange,
  onCopy,
}: {
  order: Order;
  savingStatus: boolean;
  onStatusChange: (status: string) => void;
  onCopy: (text: string, what: string) => void;
}) {
  const items = order.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  // Sanity only stores item prices and the final total, so shipping, service
  // fees and promo discounts show up together as the difference.
  const adjustments = Math.round(((order.total ?? 0) - subtotal) * 100) / 100;
  const address = addressLines(order);
  const email = order.customerEmail || order.shippingEmail;

  return (
    <Card padding={4} radius={3} shadow={1} style={{ position: 'sticky', top: 16 }}>
      <Stack space={5}>
        {/* Title + status */}
        <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
          <Stack space={2}>
            <Heading size={1}>{order.orderNumber}</Heading>
            <Text size={1} muted>
              {format(new Date(order.createdAt), "d MMM yyyy 'at' h:mm a")}
            </Text>
          </Stack>
          <Stack space={2} style={{ minWidth: 170 }}>
            <Select
              value={order.status}
              disabled={savingStatus}
              onChange={(event) => onStatusChange(event.currentTarget.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.title}
                </option>
              ))}
            </Select>
            {order.status === 'CANCELLED' && (
              <Text size={0} muted>
                Cancelling here doesn’t return items to stock.
              </Text>
            )}
          </Stack>
        </Flex>

        {/* Customer + delivery */}
        <Grid columns={[1, 2]} gap={4}>
          <Section title="Customer">
            <Stack space={2}>
              <Text weight="medium">{order.customerName || '—'}</Text>
              {email && (
                <Text size={1}>
                  <a href={`mailto:${email}`}>{email}</a>
                </Text>
              )}
              {order.shippingPhone && (
                <Text size={1}>
                  <a href={`tel:${order.shippingPhone}`}>{order.shippingPhone}</a>
                </Text>
              )}
            </Stack>
          </Section>

          <Section title={deliveryLabel(order)}>
            {order.deliveryMethod === 'pickup' ? (
              <Text size={1}>{order.pickupLocationName || 'Pickup location not recorded'}</Text>
            ) : order.deliveryMethod === 'inperson' ? (
              <Text size={1}>Handed over in person</Text>
            ) : address.length ? (
              <Stack space={2}>
                {address.map((line) => (
                  <Text key={line} size={1}>
                    {line}
                  </Text>
                ))}
                <Box>
                  <Button
                    icon={CopyIcon}
                    text="Copy address"
                    mode="ghost"
                    fontSize={1}
                    padding={2}
                    onClick={() => onCopy(address.join('\n'), 'Address')}
                  />
                </Box>
              </Stack>
            ) : (
              <Text size={1} muted>
                No address recorded
              </Text>
            )}
          </Section>
        </Grid>

        {/* Items */}
        <Section title={`Items (${itemCount(order)})`}>
          <Stack space={2}>
            {items.map((item) => {
              const variant = [item.color, item.size].filter((v) => v && v !== 'Size' && v !== 'Default').join(' · ');

              return (
                <Card key={item._key} padding={3} radius={2} tone="transparent" border>
                  <Flex align="center" gap={3}>
                    <Stack space={2} flex={1}>
                      <Text weight="medium">{item.name || 'Unnamed item'}</Text>
                      <Text size={1} muted>
                        {[variant, item.sku && `SKU ${item.sku}`].filter(Boolean).join(' · ')}
                      </Text>
                    </Stack>
                    <Text size={1} muted>
                      {item.quantity ?? 1} × {money(item.price)}
                    </Text>
                    <Box style={{ minWidth: 70, textAlign: 'right' }}>
                      <Text weight="medium">{money((item.price ?? 0) * (item.quantity ?? 1))}</Text>
                    </Box>
                  </Flex>
                </Card>
              );
            })}
          </Stack>

          {/* Totals */}
          <Stack space={2} paddingTop={2}>
            <Flex justify="space-between">
              <Text size={1} muted>
                Items subtotal
              </Text>
              <Text size={1}>{money(subtotal)}</Text>
            </Flex>
            {adjustments !== 0 && (
              <Flex justify="space-between">
                <Text size={1} muted>
                  Shipping, fees &amp; discounts
                </Text>
                <Text size={1}>
                  {adjustments > 0 ? '+' : '−'}
                  {money(Math.abs(adjustments))}
                </Text>
              </Flex>
            )}
            <Card borderTop paddingTop={2}>
              <Flex justify="space-between">
                <Text weight="semibold">Total paid</Text>
                <Text weight="semibold">{money(order.total)}</Text>
              </Flex>
            </Card>
          </Stack>
        </Section>

        {order.notes && (
          <Section title="Notes">
            <Text size={1} style={{ whiteSpace: 'pre-wrap' }}>
              {order.notes}
            </Text>
          </Section>
        )}

        {/* Payment + links */}
        <Flex gap={2} wrap="wrap">
          {order.stripePaymentIntentId && (
            <Button
              as="a"
              href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
              target="_blank"
              rel="noopener noreferrer"
              icon={LaunchIcon}
              text="View payment in Stripe"
              mode="ghost"
              fontSize={1}
            />
          )}
          <Button
            as="a"
            href={`/intent/edit/id=${order._id};type=order/`}
            target="_blank"
            icon={LaunchIcon}
            text="Open full order"
            mode="ghost"
            fontSize={1}
          />
        </Flex>
      </Stack>
    </Card>
  );
}

export default OrderListView;
