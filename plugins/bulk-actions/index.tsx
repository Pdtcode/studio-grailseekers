import { definePlugin } from 'sanity';
import { ListIcon } from '@sanity/icons';
import OrderListView from './OrderListView';

export const bulkOrderActionsPlugin = definePlugin({
  name: 'bulk-order-actions',
  tools: [
    {
      name: 'order-manager',
      title: 'Order Manager',
      icon: ListIcon,
      component: () => (
        <OrderListView
          title="All Orders"
          filter=""
        />
      ),
    },
  ],
});

export default bulkOrderActionsPlugin;