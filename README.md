# Grail Seekers Studio

Sanity Studio (CMS/admin) for the Grail Seekers store: **https://gsstudio.netlify.app/structure**

Pushing to `main` deploys to Netlify automatically. There is no `sanity deploy` step.

## Sidebar

- **Orders** by status
- **Products**: Live on site / Hidden / All. Each product has an editable **Current Database Inventory** panel with change history and undo/redo.
- **Bundle Deals**
- **Store Setup**: Categories, Collections, Promo Codes, Pickup Locations, Site Password, Inventory Log

The **Order Manager** in the top bar has status tabs, search, an order detail view, bulk status changes and a CSV export of processing orders.

## How data syncs

Stock and orders live in the website's Neon database, and everything syncs automatically:

- **Publishing a product** creates or updates it in the database through the Sanity webhook "sync-inventory". Stock is never overwritten.
- **Changing an order status** here updates the database through the Sanity webhook "sync".
- **Paid orders** appear here automatically when Stripe confirms payment.
- **Stock edits** go through the product inventory panel and are recorded in Inventory Log.

## Development

```bash
npm install
npm run dev     # local Studio
npm run build   # production build
```

See `../CLAUDE.md` for the full architecture across both repos.
