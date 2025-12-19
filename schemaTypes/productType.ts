import { defineField, defineType } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
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
    },
    prepare({ title, media, price }) {
      return {
        title,
        subtitle: price ? `$${price}` : "Price not set",
        media,
      };
    },
  },
});
