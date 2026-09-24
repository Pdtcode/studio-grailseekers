import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes/index'
import {bulkOrderActionsPlugin} from './plugins/bulk-actions'

// The single Site Password settings document. The dot in the id keeps it out
// of the public API — the dataset is public, and this holds the password.
const SITE_PROTECTION_ID = 'settings.siteProtection'

// Types kept in the schema (their data and website code still work) but not
// shown in the Studio because they're unused or internal. Add a type back to
// the desk below to bring it back.
const HIDDEN_TYPES = [
  'post', // News — no posts, /news isn't linked from the site
  'author',
  'dropPassword', // Drops — drop page is shelved
  'dropSettings',
  'promoUsage', // nothing records promo usage
  'syncState', // webhook/sync bookkeeping, written by the website
]

// Types that can't be created from "Create new": singletons, code-written, or hidden
const NO_CREATE_TYPES = ['inventoryAdjustment', 'siteProtection', ...HIDDEN_TYPES]

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
            S.listItem()
              .title('Site Password')
              .id('siteProtection')
              .child(
                S.document()
                  .title('Site Password')
                  .schemaType('siteProtection')
                  .documentId(SITE_PROTECTION_ID)
              ),
            S.divider(),
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
            // Less frequently edited store configuration
            S.listItem()
              .title('Store Setup')
              .id('storeSetup')
              .child(
                S.list()
                  .title('Store Setup')
                  .items([
                    S.documentTypeListItem('category').title('Categories'),
                    S.documentTypeListItem('collection').title('Collections'),
                    S.documentTypeListItem('promoCode').title('Promo Codes'),
                  ])
              ),
          ])
    }),
    bulkOrderActionsPlugin(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !NO_CREATE_TYPES.includes(schemaType)),
  },

  document: {
    // Site Password is one fixed document: allow publishing and reverting it,
    // but not deleting, duplicating or unpublishing it.
    actions: (actions, {schemaType}) =>
      schemaType === 'siteProtection'
        ? actions.filter(({action}) => action === 'publish' || action === 'discardChanges' || action === 'restore')
        : actions,
  },
})
