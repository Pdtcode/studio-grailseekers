import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Site-wide "Spend & Save" campaign: customers who spend at least a tier's
 * amount on items get that tier's fixed discount at checkout, automatically.
 *
 * One document only, with the fixed id `spendCampaign` (see sanity.config.ts).
 * The website re-reads it at checkout and works the discount out server-side
 * (gsweb lib/spend-campaign.ts), so what's published here is what's charged.
 */
export default defineType({
  name: "spendCampaign",
  title: "Spend & Save",
  type: "document",
  fields: [
    defineField({
      name: "enabled",
      title: "Campaign on",
      type: "boolean",
      description:
        "Turn the offer on or off. Changes reach the website within about a minute of publishing.",
      initialValue: false,
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description:
        'Shown to customers next to the discount at checkout, in the order email and in Order Manager, e.g. "Spend & Save".',
      initialValue: "Spend & Save",
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: "tiers",
      title: "Tiers",
      type: "array",
      description:
        "Spend at least this much on items (after bundle savings, before the service fee) to get this much off. Customers get the highest tier they reach. Works together with promo codes.",
      of: [
        defineArrayMember({
          type: "object",
          name: "tier",
          fields: [
            defineField({
              name: "minSpend",
              title: "Spend at least ($)",
              type: "number",
              validation: (Rule) => Rule.required().positive(),
            }),
            defineField({
              name: "discount",
              title: "Get off ($)",
              type: "number",
              validation: (Rule) =>
                Rule.required()
                  .positive()
                  .custom((discount, context) => {
                    const minSpend = (context.parent as { minSpend?: number } | undefined)?.minSpend;

                    return typeof discount === "number" && typeof minSpend === "number" && discount >= minSpend
                      ? "The discount must be smaller than the amount spent"
                      : true;
                  }),
            }),
          ],
          preview: {
            select: { minSpend: "minSpend", discount: "discount" },
            prepare({ minSpend, discount }) {
              return {
                title: `Spend $${minSpend ?? "?"} → $${discount ?? "?"} off`,
              };
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((tiers, context) => {
          const enabled = (context.document as { enabled?: boolean } | undefined)?.enabled;
          const list = (tiers ?? []) as { minSpend?: number }[];

          if (enabled && list.length === 0) return "Add at least one tier, or turn the campaign off";

          const spends = list.map((tier) => tier.minSpend).filter((v) => typeof v === "number");

          return new Set(spends).size !== spends.length ? "Each tier needs a different spend amount" : true;
        }),
    }),
    defineField({
      name: "startsAt",
      title: "Starts",
      type: "datetime",
      description: "Optional. Leave empty to start as soon as it's published and turned on.",
    }),
    defineField({
      name: "endsAt",
      title: "Ends",
      type: "datetime",
      description: "Optional. The offer and banner switch off automatically at this time.",
      validation: (Rule) =>
        Rule.custom((endsAt, context) => {
          const startsAt = (context.document as { startsAt?: string } | undefined)?.startsAt;

          return endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)
            ? "Must be after the start"
            : true;
        }),
    }),
    defineField({
      name: "showBanner",
      title: "Show banner",
      type: "boolean",
      description: "Show a slim announcement bar at the top of every page while the offer is running.",
      initialValue: true,
    }),
    defineField({
      name: "bannerText",
      title: "Banner text",
      type: "string",
      description:
        'Optional. Leave empty to build it from the tiers, e.g. "Spend $100, get $10 off · Spend $200, get $25 off".',
      hidden: ({ document }) => document?.showBanner === false,
      validation: (Rule) => Rule.max(120),
    }),
  ],
  preview: {
    select: { enabled: "enabled", name: "name" },
    prepare({ enabled, name }) {
      return {
        title: name || "Spend & Save",
        subtitle: enabled ? "🟢 On" : "⚪ Off",
      };
    },
  },
});
