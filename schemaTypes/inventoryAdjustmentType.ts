import { defineField, defineType } from "sanity";

/**
 * One stock edit made from a product's inventory panel. The panel creates this
 * document and the website applies it to the Neon database, then marks it
 * applied or rejected — so this doubles as a log of every manual stock change.
 * Entries are written by the panel only and are read-only here.
 *
 * `kind` is "set" for a normal edit, or "undo"/"redo" pointing at the set it
 * reverses/replays via `target`. `undone` is flipped on the set itself so the
 * panel knows whether to offer Undo or Redo.
 */
export default defineType({
  name: "inventoryAdjustment",
  title: "Inventory Log",
  type: "document",
  readOnly: true,
  fields: [
    defineField({ name: "productName", title: "Product", type: "string" }),
    defineField({ name: "productSlug", title: "Product Slug", type: "string" }),
    defineField({ name: "sku", title: "SKU", type: "string" }),
    defineField({ name: "variantLabel", title: "Option", type: "string" }),
    defineField({ name: "previousStock", title: "Stock Before", type: "number" }),
    defineField({ name: "newStock", title: "Stock After", type: "number" }),
    defineField({ name: "note", title: "Note", type: "string" }),
    defineField({
      name: "kind",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Set stock", value: "set" },
          { title: "Undo", value: "undo" },
          { title: "Redo", value: "redo" },
        ],
      },
    }),
    defineField({
      name: "target",
      title: "Undoes / Redoes",
      type: "reference",
      to: [{ type: "inventoryAdjustment" }],
      weak: true,
      hidden: ({ document }) => !document?.target,
    }),
    defineField({
      name: "undone",
      title: "Undone",
      type: "boolean",
      description: "This change has been undone (and not redone since)",
      hidden: ({ document }) => document?.kind === "undo" || document?.kind === "redo",
    }),
    defineField({ name: "changedBy", title: "Changed By", type: "string" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Applied", value: "applied" },
          { title: "Rejected", value: "rejected" },
        ],
      },
    }),
    defineField({ name: "error", title: "Rejection Reason", type: "string" }),
    defineField({ name: "resolvedAt", title: "Resolved At", type: "datetime" }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "createdDesc",
      by: [{ field: "_createdAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      productName: "productName",
      variantLabel: "variantLabel",
      previousStock: "previousStock",
      newStock: "newStock",
      status: "status",
      changedBy: "changedBy",
      kind: "kind",
      undone: "undone",
    },
    prepare({ productName, variantLabel, previousStock, newStock, status, changedBy, kind, undone }) {
      const icon = status === "applied" ? "✅" : status === "rejected" ? "⛔" : "⏳";
      const label = kind === "undo" ? "Undo: " : kind === "redo" ? "Redo: " : "";
      const suffix = undone ? " (undone)" : "";

      return {
        title: `${icon} ${label}${productName || "Unknown product"}${variantLabel ? ` · ${variantLabel}` : ""}${suffix}`,
        subtitle: `${previousStock} → ${newStock}${changedBy ? ` · ${changedBy}` : ""}`,
      };
    },
  },
});
