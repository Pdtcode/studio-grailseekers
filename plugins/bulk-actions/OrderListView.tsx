import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useMediaIndex,
  useToast,
} from '@sanity/ui';
import { ArrowLeftIcon, CopyIcon, LaunchIcon, RefreshIcon, SearchIcon } from '@sanity/icons';
import { useClient } from 'sanity';
import { format, formatDistanceToNow } from 'date-fns';
import BulkOrderActions from './BulkOrderActions';
import ExportProcessingOrdersButton from './ExportProcessingOrdersButton';
import { CARRIERS, carrierTitle, trackingLink } from '../../lib/tracking';

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
  campaignDiscount?: number;
  campaignName?: string;
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
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
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

const isPosted = (order: Order) => order.deliveryMethod !== 'pickup' && order.deliveryMethod !== 'inperson';

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
  _id, orderNumber, customerName, customerEmail, total, campaignDiscount, campaignName, status, createdAt,
  items[]{_key, name, sku, color, size, quantity, price},
  shippingFirstName, shippingLastName, shippingEmail, shippingPhone,
  shippingAddress, shippingApartment, shippingCity, shippingState, shippingZipCode, shippingCountry,
  deliveryMethod, pickupLocationName, shippingCarrier, trackingNumber, trackingUrl, shippedAt,
  stripePaymentIntentId, notes
`;

/** Order Manager: search, filter by status, and see each order in full. */
const OrderListView: React.FC<OrderListViewProps> = ({ filter = '', title }) => {
  const client = useClient({ apiVersion: '2023-05-03' });
  const toast = useToast();
  // List and detail sit side by side from 900px; narrower screens show one at a time
  const isSplit = useMediaIndex() >= 3;
  const rootRef = useRef<HTMLDivElement>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [returnToId, setReturnToId] = useState<string | null>(null);

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

      return [order.orderNumber, order.customerName, order.customerEmail, order.shippingEmail, order.trackingNumber]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [orders, statusFilter, search]);

  const activeOrder = isSplit
    ? (visibleOrders.find((o) => o._id === activeId) ?? visibleOrders[0] ?? null)
    : // Look in all orders so a status change that moves it out of the current tab keeps it open
      (orders.find((o) => o._id === activeId) ?? null);

  // On narrow screens, show the top of the detail when an order opens,
  // and the same order in the list when going back
  useEffect(() => {
    if (isSplit) return;
    if (activeId) {
      rootRef.current?.scrollIntoView({ block: 'start' });
    } else if (returnToId) {
      document.getElementById(`order-card-${returnToId}`)?.scrollIntoView({ block: 'center' });
      setReturnToId(null);
    }
  }, [activeId, isSplit, returnToId]);

  const closeDetail = () => {
    setReturnToId(activeId);
    setActiveId(null);
  };

  const allVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((o) => selectedOrderIds.includes(o._id));

  const toggleSelected = (orderId: string, checked: boolean) =>
    setSelectedOrderIds((ids) => (checked ? [...ids, orderId] : ids.filter((id) => id !== orderId)));

  const statusTitle = (status: string) => STATUSES.find((s) => s.value === status)?.title ?? status;

  const saveOrder = async (
    order: Order,
    fields: Partial<Order>,
    unset: (keyof Order)[],
    successTitle: string,
    errorTitle: string,
  ) => {
    setSavingStatus(true);
    try {
      // A status change is copied to the database by the Sanity webhook
      await client
        .patch(order._id)
        .set({ ...fields, updatedAt: new Date().toISOString() })
        .unset(unset)
        .commit();
      setOrders((list) =>
        list.map((o) => {
          if (o._id !== order._id) return o;
          const next = { ...o, ...fields };
          for (const key of unset) delete next[key];
          return next;
        }),
      );
      toast.push({ status: 'success', title: successTitle });
    } catch (err) {
      toast.push({
        status: 'error',
        title: errorTitle,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const updateStatus = (order: Order, status: string) =>
    saveOrder(order, { status }, [], `${order.orderNumber} marked ${statusTitle(status)}`, 'Could not update status');

  const saveTracking = (order: Order, tracking: TrackingInput, markShipped: boolean) => {
    const fields: Partial<Order> = { shippingCarrier: tracking.carrier };
    const unset: (keyof Order)[] = [];

    if (tracking.number) fields.trackingNumber = tracking.number;
    else unset.push('trackingNumber');
    if (tracking.url) fields.trackingUrl = tracking.url;
    else unset.push('trackingUrl');
    if (tracking.number && !order.shippedAt) fields.shippedAt = new Date().toISOString();
    if (markShipped) fields.status = 'SHIPPED';

    return saveOrder(
      order,
      fields,
      unset,
      markShipped ? `${order.orderNumber} tracking saved and marked Shipped` : `${order.orderNumber} tracking saved`,
      'Could not save tracking',
    );
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

  if (!isSplit && activeOrder) {
    return (
      <Box padding={3} ref={rootRef}>
        <Stack space={3}>
          <Box>
            <Button icon={ArrowLeftIcon} mode="bleed" text="All orders" onClick={closeDetail} />
          </Box>
          <OrderDetail
            order={activeOrder}
            compact
            savingStatus={savingStatus}
            onStatusChange={(status) => updateStatus(activeOrder, status)}
            onSaveTracking={(tracking, markShipped) => saveTracking(activeOrder, tracking, markShipped)}
            onCopy={copy}
          />
        </Stack>
      </Box>
    );
  }

  return (
    <Box padding={[3, 3, 4]} ref={rootRef}>
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
          {/* Scrolls sideways when the tabs don't fit */}
          <Box style={{ overflowX: 'auto' }}>
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
          </Box>
          <TextInput
            icon={SearchIcon}
            placeholder="Search by order number, name, email or tracking number"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Stack>

        <BulkOrderActions
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
          onAction={fetchOrders}
        />

        <Grid columns={isSplit ? 2 : 1} gap={4}>
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
                  id={`order-card-${order._id}`}
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

          {/* Order detail (narrow screens open it in place of the list) */}
          {isSplit && (
            <Box>
              {activeOrder ? (
                <OrderDetail
                  order={activeOrder}
                  savingStatus={savingStatus}
                  onStatusChange={(status) => updateStatus(activeOrder, status)}
                  onSaveTracking={(tracking, markShipped) => saveTracking(activeOrder, tracking, markShipped)}
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
          )}
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

interface TrackingInput {
  carrier: string;
  number: string;
  url: string;
}

/** Carrier + tracking number for posted orders, with a link to the carrier's tracking page. */
function TrackingSection({
  order,
  compact,
  saving,
  onSave,
  onCopy,
}: {
  order: Order;
  compact: boolean;
  saving: boolean;
  onSave: (tracking: TrackingInput, markShipped: boolean) => void;
  onCopy: (text: string, what: string) => void;
}) {
  const savedCarrier = order.shippingCarrier ?? 'usps';
  const [carrier, setCarrier] = useState(savedCarrier);
  const [number, setNumber] = useState(order.trackingNumber ?? '');
  const [url, setUrl] = useState(order.trackingUrl ?? '');
  const [markShipped, setMarkShipped] = useState(true);

  const tracking = { carrier, number: number.trim(), url: url.trim() };
  const changed =
    carrier !== savedCarrier ||
    tracking.number !== (order.trackingNumber ?? '') ||
    tracking.url !== (order.trackingUrl ?? '');
  // Nothing to save until there's a number, unless an existing one is being cleared
  const canSave = changed && (!!tracking.number || !!order.trackingNumber);
  const offerShipped = order.status === 'PROCESSING' && !!tracking.number;
  const savedLink = trackingLink(order.shippingCarrier, order.trackingNumber, order.trackingUrl);

  return (
    <Section title="Tracking">
      {order.trackingNumber && (
        <Stack space={2}>
          <Text size={1}>
            {carrierTitle(order.shippingCarrier)} · {order.trackingNumber}
            {order.shippedAt && ` · shipped ${format(new Date(order.shippedAt), 'd MMM yyyy')}`}
          </Text>
          <Flex gap={2} wrap="wrap">
            {savedLink && (
              <Button
                as="a"
                href={savedLink}
                target="_blank"
                rel="noopener noreferrer"
                icon={LaunchIcon}
                text="Track package"
                mode="ghost"
                fontSize={1}
                padding={2}
              />
            )}
            <Button
              icon={CopyIcon}
              text="Copy number"
              mode="ghost"
              fontSize={1}
              padding={2}
              onClick={() => onCopy(order.trackingNumber ?? '', 'Tracking number')}
            />
          </Flex>
        </Stack>
      )}

      <Grid columns={compact ? 1 : [1, 3]} gap={2}>
        <Select
          aria-label="Carrier"
          value={carrier}
          disabled={saving}
          onChange={(event) => setCarrier(event.currentTarget.value)}
        >
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.title}
            </option>
          ))}
        </Select>
        <Box style={compact ? undefined : { gridColumn: 'span 2' }}>
          <TextInput
            aria-label="Tracking number"
            placeholder="Tracking number"
            value={number}
            disabled={saving}
            onChange={(event) => setNumber(event.currentTarget.value)}
          />
        </Box>
      </Grid>
      {(carrier === 'other' || !!order.trackingUrl) && (
        <TextInput
          aria-label="Tracking link"
          placeholder="Tracking link (https://…)"
          type="url"
          value={url}
          disabled={saving}
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
      )}
      <Flex align="center" gap={3} wrap="wrap">
        <Button
          text={offerShipped && markShipped ? 'Save & mark Shipped' : 'Save tracking'}
          tone="primary"
          fontSize={1}
          padding={2}
          disabled={saving || !canSave}
          onClick={() => onSave(tracking, offerShipped && markShipped)}
        />
        {offerShipped && canSave && (
          <Flex as="label" align="center" gap={2}>
            <Checkbox checked={markShipped} onChange={(event) => setMarkShipped(event.currentTarget.checked)} />
            <Text size={1}>Also mark as Shipped</Text>
          </Flex>
        )}
      </Flex>
    </Section>
  );
}

function OrderDetail({
  order,
  compact = false,
  savingStatus,
  onStatusChange,
  onSaveTracking,
  onCopy,
}: {
  order: Order;
  /** Narrow-screen layout: not sticky, quantity under the item name */
  compact?: boolean;
  savingStatus: boolean;
  onStatusChange: (status: string) => void;
  onSaveTracking: (tracking: TrackingInput, markShipped: boolean) => void;
  onCopy: (text: string, what: string) => void;
}) {
  const items = order.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  const campaignDiscount = order.campaignDiscount ?? 0;
  // Sanity stores item prices, the Spend & Save discount and the final total,
  // so shipping, service fees and promo codes show up together as the rest.
  const adjustments = Math.round(((order.total ?? 0) - subtotal + campaignDiscount) * 100) / 100;
  const address = addressLines(order);
  const email = order.customerEmail || order.shippingEmail;

  return (
    <Card
      padding={compact ? 3 : 4}
      radius={3}
      shadow={1}
      style={compact ? undefined : { position: 'sticky', top: 16 }}
    >
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

        {isPosted(order) && (
          <TrackingSection
            key={order._id}
            order={order}
            compact={compact}
            saving={savingStatus}
            onSave={onSaveTracking}
            onCopy={onCopy}
          />
        )}

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
                      {compact && (
                        <Text size={1} muted>
                          {item.quantity ?? 1} × {money(item.price)}
                        </Text>
                      )}
                    </Stack>
                    {!compact && (
                      <Text size={1} muted>
                        {item.quantity ?? 1} × {money(item.price)}
                      </Text>
                    )}
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
            {campaignDiscount > 0 && (
              <Flex justify="space-between">
                <Text size={1} muted>
                  {order.campaignName || 'Spend & Save'}
                </Text>
                <Text size={1}>−{money(campaignDiscount)}</Text>
              </Flex>
            )}
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
