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
            // All other document types
            ...S.documentTypeListItems().filter(
              (listItem) => !['order'].includes(listItem.getId() || '')
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
  },
})
