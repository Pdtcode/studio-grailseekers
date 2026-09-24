import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes/index'
import {orderSyncPlugin} from './plugins/order-sync'
import {bulkOrderActionsPlugin} from './plugins/bulk-actions'
import {productSyncPlugin} from './plugins/product-sync'

export default defineConfig({
  name: 'default',
  title: 'grail-seekers',

  projectId: 'arbp7h2s',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Orders organized by status
            S.listItem()
              .title('Orders')
              .child(
                S.list()
                  .title('Orders by Status')
                  .items([
                    S.listItem()
                      .title('Pending Orders')
                      .child(
                        S.documentList()
                          .title('Pending Orders')
                          .filter('_type == "order" && status == "PENDING"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                    S.listItem()
                      .title('Processing Orders')
                      .child(
                        S.documentList()
                          .title('Processing Orders')
                          .filter('_type == "order" && status == "PROCESSING"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                    S.listItem()
                      .title('Shipped Orders')
                      .child(
                        S.documentList()
                          .title('Shipped Orders')
                          .filter('_type == "order" && status == "SHIPPED"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                    S.listItem()
                      .title('Delivered Orders')
                      .child(
                        S.documentList()
                          .title('Delivered Orders')
                          .filter('_type == "order" && status == "DELIVERED"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                    S.listItem()
                      .title('Cancelled Orders')
                      .child(
                        S.documentList()
                          .title('Cancelled Orders')
                          .filter('_type == "order" && status == "CANCELLED"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                    S.divider(),
                    S.listItem()
                      .title('All Orders')
                      .child(
                        S.documentList()
                          .title('All Orders')
                          .filter('_type == "order"')
                          .defaultOrdering([{field: 'createdAt', direction: 'desc'}])
                      ),
                  ])
              ),
            S.divider(),
            // Products, split by whether they are live on the website
            S.listItem()
              .title('Products')
              .child(
                S.list()
                  .title('Products')
                  .items([
                    S.listItem()
                      .title('Live On Site')
                      .child(
                        S.documentList()
                          .title('Live On Site')
                          .filter('_type == "product" && isActive != false')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.listItem()
                      .title('Hidden')
                      .child(
                        S.documentList()
                          .title('Hidden')
                          .filter('_type == "product" && isActive == false')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.divider(),
                    S.listItem()
                      .title('All Products')
                      .child(
                        S.documentList()
                          .title('All Products')
                          .filter('_type == "product"')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                  ])
              ),
            // Every stock edit made from a product's inventory panel
            S.listItem()
              .title('Inventory Log')
              .child(
                S.documentList()
                  .title('Inventory Log')
                  .filter('_type == "inventoryAdjustment"')
                  .defaultOrdering([{field: '_createdAt', direction: 'desc'}])
              ),
            S.divider(),
            // Pickup Locations
            S.listItem()
              .title('Pickup Locations')
              .child(
                S.documentList()
                  .title('Pickup Locations')
                  .filter('_type == "pickupLocation"')
              ),
            S.divider(),
            // Bundle Deals
            S.listItem()
              .title('Bundle Deals')
              .child(
                S.list()
                  .title('Bundle Deals')
                  .items([
                    S.listItem()
                      .title('Active Bundles')
                      .child(
                        S.documentList()
                          .title('Active Bundles')
                          .filter('_type == "bundleDeal" && isActive == true')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.listItem()
                      .title('Inactive Bundles')
                      .child(
                        S.documentList()
                          .title('Inactive Bundles')
                          .filter('_type == "bundleDeal" && isActive != true')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.divider(),
                    S.listItem()
                      .title('All Bundles')
                      .child(
                        S.documentList()
                          .title('All Bundles')
                          .filter('_type == "bundleDeal"')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                  ])
              ),
            S.divider(),
            // All other document types
            ...S.documentTypeListItems().filter(
              (listItem) => !['order', 'pickupLocation', 'bundleDeal', 'product', 'inventoryAdjustment'].includes(listItem.getId() || '')
            ),
          ])
    }),
    visionTool(),
    orderSyncPlugin(),
    bulkOrderActionsPlugin(),
    productSyncPlugin()
  ],

  schema: {
    types: schemaTypes,
    // Log entries are only created by the inventory panel
    templates: (templates) => templates.filter(({schemaType}) => schemaType !== 'inventoryAdjustment'),
  },
})
