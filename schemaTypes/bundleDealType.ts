import { defineField, defineType } from "sanity";
import { BundleSavingsDisplay } from "../components/BundleSavingsDisplay";

export default defineType({
  name: "bundleDeal",
  title: "Bundle Deal",
  type: "document",
  fields: [
    // Read-only live pricing/stock summary (custom component)
    defineField({
      name: "bundleSummary",
      title: "Bundle Summary",
      type: "string",
      description:
        "Live component pricing, savings, and available stock (read-only)",
      components: {
        input: BundleSavingsDisplay,
      },
      readOnly: true,
    }),
    defineField({
      name: "name",
      title: "Bundle Name",
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
      name: "items",
      title: "Products In This Bundle",
      type: "array",
      description:
        "Add two or more products. Customers pick a size for each at checkout, and stock is deducted from each product individually.",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "product",
              title: "Product",
              type: "reference",
              to: [{ type: "product" }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "quantity",
              title: "Quantity",
              type: "number",
              description: "How many of this product are included",
              initialValue: 1,
              validation: (Rule) => Rule.required().min(1).integer(),
            }),
          ],
          preview: {
            select: {
              title: "product.name",
              quantity: "quantity",
              media: "product.mainImage",
            },
            prepare({ title, quantity, media }) {
              return {
                title: title || "No product selected",
                subtitle: `Qty: ${quantity ?? 1}`,
                media,
              };
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.required()
          .min(2)
          .error("A bundle needs at least two products"),
    }),
    defineField({
      name: "bundlePrice",
      title: "Bundle Price",
      type: "number",
      description:
        "The total price the customer pays for the whole bundle. See Bundle Summary above for the implied savings.",
      validation: (Rule) => Rule.required().positive(),
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
      description:
        "Optional. If left empty, the first product's image is used.",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "images",
      title: "Additional Images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      description: "Inactive bundles do not appear on the storefront",
      initialValue: true,
    }),
    defineField({
      name: "featured",
      title: "Featured Bundle",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "startDate",
      title: "Starts At",
      type: "datetime",
      description: "Optional. Bundle is hidden before this time.",
    }),
    defineField({
      name: "endDate",
      title: "Ends At",
      type: "datetime",
      description: "Optional. Bundle is hidden after this time.",
      validation: (Rule) =>
        Rule.custom((endDate, context) => {
          const startDate = (context.document as any)?.startDate;

          if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
            return "End date must be after the start date";
          }

          return true;
        }),
    }),
  ],
  preview: {
    select: {
      title: "name",
      price: "bundlePrice",
      isActive: "isActive",
      media: "mainImage",
      item0: "items.0.product.name",
      item1: "items.1.product.name",
      fallbackMedia: "items.0.product.mainImage",
    },
    prepare({ title, price, isActive, media, item0, item1, fallbackMedia }) {
      const names = [item0, item1].filter(Boolean);
      const summary = names.length ? names.join(" + ") : "No products yet";

      return {
        title: `${title || "Unnamed Bundle"}${isActive === false ? " (inactive)" : ""}`,
        subtitle: `${summary}${price ? ` — $${price}` : ""}`,
        media: media || fallbackMedia,
      };
    },
  },
});
