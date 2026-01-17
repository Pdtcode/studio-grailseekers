import { definePlugin } from 'sanity';
import { SyncIcon } from '@sanity/icons';
import ProductSyncTool from './ProductSyncTool';

export const productSyncPlugin = definePlugin({
  name: 'product-sync',
  tools: [
    {
      name: 'product-sync',
      title: 'Product Sync',
      icon: SyncIcon,
      component: ProductSyncTool,
    },
  ],
});

export default productSyncPlugin;