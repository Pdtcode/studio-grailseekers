import { defineField, defineType } from "sanity";
import { NeonInventoryDisplay } from "../components/NeonInventoryDisplay";
import { ImageDisplayInput } from "../components/ImageDisplayInput";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    // Real-time Neon Inventory Display (custom component)
    defineField({
      name: "neonInventory",
      title: "Current Database Inventory",
      type: "string",
      description: "Real-time inventory from Neon database (read-only display)",
      components: {
        input: NeonInventoryDisplay,
      },
      hidden: false,
      readOnly: true,
    }),
    defineField({
      name: "name",
      title: "Product Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: "comparePrice",
      title: "Compare Price",
      description: "Original price before discount",
      type: "number",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "images",
      title: "Additional Images",
      type: "array",
      of: [
        {
          type: "image",
          options: {
            hotspot: true,
          },
          // Images will automatically get a unique key from Sanity
        },
      ],
    }),
    defineField({
      name: "imageDisplay",
      title: "Image Sizing",
      type: "object",
      description:
        "Controls how this product's photo is fitted into the square frames used across the store. Leave as Crop to fill unless the photo is a different shape to your other products.",
      options: { collapsible: true, collapsed: false },
      components: { input: ImageDisplayInput },
      fields: [
        defineField({
          name: "fit",
          title: "Fit",
          type: "string",
          options: {
            list: [
              { title: "Crop to fill (default)", value: "cover" },
              { title: "Fit whole image, pad the sides", value: "contain" },
            ],
            layout: "radio",
          },
          initialValue: "cover",
        }),
        defineField({
          name: "background",
          title: "Background Colour",
          type: "string",
          description:
            "Hex colour used for the padding, e.g. ffffff for white. Only applies when fitting the whole image.",
          initialValue: "ffffff",
          validation: (Rule) =>
            Rule.custom((value) => {
              if (!value) return true;

              return /^#?[0-9a-fA-F]{3,8}$/.test(String(value))
                ? true
                : "Enter a hex colour such as ffffff";
            }),
        }),
        defineField({
          name: "pad",
          title: "Padding",
          type: "number",
          description:
            "Shrinks the product further inside the square. 0 = fill the frame, higher = smaller product. Try 40-120.",
          initialValue: 0,
          validation: (Rule) => Rule.min(0).max(400),
        }),
      ],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "collections",
      title: "Collections",
      type: "array",
      of: [{ type: "reference", to: { type: "collection" } }],
    }),
    defineField({
      name: "isActive",
      title: "Active",
      description:
        "Turn this OFF to retire the product from the website while keeping it here in the Studio. Hidden products disappear from the store, search, categories, collections, drops, bundles and the sitemap, and their product page returns Not Found. Existing orders are unaffected.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "inStock",
      title: "In Stock",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "featured",
      title: "Featured Product",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "variants",
      title: "Variants",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "variantId",
              title: "Variant ID",
              type: "string",
              description: "Unique identifier for this variant",
              // We'll add a random ID when this is empty
              initialValue: () =>
                Date.now().toString(36) +
                Math.random().toString(36).substring(2, 5),
            }),
            defineField({
              name: "name",
              title: "Variant Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "options",
              title: "Options",
              type: "array",
              of: [
                {
                  type: "string",
                  // Each option will get an auto-generated unique key
                },
              ],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "inventory",
              title: "Inventory",
              type: "array",
              description: "Inventory tracking for each option combination",
              of: [
                {
                  type: "object",
                  fields: [
                    defineField({
                      name: "option",
                      title: "Option",
                      type: "string",
                      description: "e.g., 'Small', 'Medium', 'Black', etc.",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "sku",
                      title: "SKU",
                      type: "string",
                      description: "Stock Keeping Unit",
                    }),
                    defineField({
                      name: "quantity",
                      title: "Quantity",
                      type: "number",
                      initialValue: 0,
                      validation: (Rule) => Rule.required().min(0),
                    }),
                    defineField({
                      name: "lowStockThreshold",
                      title: "Low Stock Threshold",
                      type: "number",
                      description: "Alert when inventory falls below this number",
                      initialValue: 5,
                    }),
                  ],
                  preview: {
                    select: {
                      option: "option",
                      quantity: "quantity",
                      sku: "sku",
                    },
                    prepare({ option, quantity, sku }) {
                      return {
                        title: option,
                        subtitle: `${quantity} in stock${sku ? ` (SKU: ${sku})` : ""}`,
                      };
                    },
                  },
                },
              ],
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "totalInventory",
      title: "Total Inventory",
      type: "number",
      description: "Total quantity available (for products without variants)",
      initialValue: 0,
      hidden: ({ document }) => document?.variants && document.variants.length > 0,
    }),
    defineField({
      name: "sku",
      title: "SKU",
      type: "string",
      description: "Stock Keeping Unit (for products without variants)",
      hidden: ({ document }) => document?.variants && document.variants.length > 0,
    }),
    defineField({
      name: "lowStockAlert",
      title: "Low Stock Alert",
      type: "number",
      description: "Show alert when inventory falls below this number",
      initialValue: 5,
    }),
    defineField({
      name: "shopURL",
      title: "External Shop URL",
      description: "Link to where this product can be purchased",
      type: "url",
    }),
    defineField({
      name: "dropExclusive",
      title: "Drop Exclusive",
      description:
        "Only show this product in password-protected drops, not in the main store",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "name",
      media: "mainImage",
      price: "price",
      isActive: "isActive",
    },
    prepare({ title, media, price, isActive }) {
      // Only ever called out when hidden — products without the field predate
      // it and are still live, so an "Active" badge on almost everything would
      // just be noise.
      const hidden = isActive === false;

      return {
        title: hidden ? `${title} — hidden` : title,
        subtitle: `${hidden ? "🚫 Not on the website · " : ""}${price ? `$${price}` : "Price not set"}`,
        media,
      };
    },
  },
});
