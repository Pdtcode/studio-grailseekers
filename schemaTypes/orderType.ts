import { defineField, defineType } from "sanity";
import { CARRIERS, carrierTitle } from "../lib/tracking";

// Tracking only applies to orders that are posted (older orders have no method and were all shipped)
const notShipped = ({ document }: { document?: Record<string, unknown> }) =>
  document?.deliveryMethod === "pickup" || document?.deliveryMethod === "inperson";

export default defineType({
  name: "order",
  title: "Order",
  type: "document",
  fieldsets: [
    {
      name: "tracking",
      title: "Shipment tracking",
      description: "Also editable from the Order Manager",
      hidden: notShipped,
    },
  ],
  fields: [
    defineField({
      name: "orderNumber",
      title: "Order Number",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "customerEmail",
      title: "Customer Email",
      type: "string",
    }),
    defineField({
      name: "customerName",
      title: "Customer Name",
      type: "string",
    }),
    defineField({
      name: "total",
      title: "Total",
      type: "number",
      validation: (Rule) => Rule.required().precision(2),
    }),
    defineField({
      name: "campaignDiscount",
      title: "Spend & Save Discount",
      type: "number",
      description: "Discount from the site-wide Spend & Save campaign (set automatically at checkout)",
      readOnly: true,
    }),
    defineField({
      name: "campaignName",
      title: "Campaign",
      type: "string",
      readOnly: true,
      hidden: ({ document }) => !document?.campaignDiscount,
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "PENDING" },
          { title: "Processing", value: "PROCESSING" },
          { title: "Shipped", value: "SHIPPED" },
          { title: "Delivered", value: "DELIVERED" },
          { title: "Cancelled", value: "CANCELLED" },
        ],
        layout: "dropdown",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "shippingCarrier",
      title: "Carrier",
      type: "string",
      fieldset: "tracking",
      options: {
        list: CARRIERS.map(({ title, value }) => ({ title, value })),
        layout: "radio",
        direction: "horizontal",
      },
    }),
    defineField({
      name: "trackingNumber",
      title: "Tracking Number",
      type: "string",
      fieldset: "tracking",
    }),
    defineField({
      name: "trackingUrl",
      title: "Tracking Link",
      type: "url",
      fieldset: "tracking",
      description: "Only needed for other carriers. USPS, UPS, FedEx and DHL links are built from the tracking number.",
      hidden: ({ document }) => document?.shippingCarrier !== "other" && !document?.trackingUrl,
    }),
    defineField({
      name: "shippedAt",
      title: "Shipped On",
      type: "datetime",
      fieldset: "tracking",
    }),
    defineField({
      name: "items",
      title: "Items",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            // Note: _key is a system field automatically added by Sanity, not defined here
            defineField({
              name: "itemId",
              type: "string",
              title: "Item ID",
              initialValue: () =>
                Date.now().toString(36) +
                Math.random().toString(36).substring(2, 5),
            }),
            defineField({
              name: "productId",
              type: "string",
              title: "Product ID",
            }),
            defineField({
              name: "variantId",
              type: "string",
              title: "Variant ID",
            }),
            defineField({
              name: "name",
              type: "string",
              title: "Product Name",
            }),
            defineField({
              name: "sku",
              type: "string",
              title: "SKU",
            }),
            defineField({
              name: "color",
              type: "string",
              title: "Color",
            }),
            defineField({
              name: "size",
              type: "string",
              title: "Size",
            }),
            defineField({
              name: "quantity",
              type: "number",
              title: "Quantity",
            }),
            defineField({ name: "price", type: "number", title: "Price" }),
          ],
        },
      ],
    }),
    defineField({
      name: "shippingFirstName",
      title: "Shipping First Name",
      type: "string",
    }),
    defineField({
      name: "shippingLastName",
      title: "Shipping Last Name",
      type: "string",
    }),
    defineField({
      name: "shippingEmail",
      title: "Shipping Email",
      type: "string",
    }),
    defineField({
      name: "shippingPhone",
      title: "Shipping Phone",
      type: "string",
    }),
    defineField({
      name: "shippingAddress",
      title: "Shipping Address",
      type: "string",
    }),
    defineField({
      name: "shippingApartment",
      title: "Shipping Apartment / Unit",
      type: "string",
    }),
    defineField({
      name: "shippingCity",
      title: "Shipping City",
      type: "string",
    }),
    defineField({
      name: "shippingState",
      title: "Shipping State",
      type: "string",
    }),
    defineField({
      name: "shippingZipCode",
      title: "Shipping Zip Code",
      type: "string",
    }),
    defineField({
      name: "shippingCountry",
      title: "Shipping Country",
      type: "string",
    }),
    defineField({
      name: "deliveryMethod",
      title: "Delivery Method",
      type: "string",
      options: {
        list: [
          { title: "Shipping", value: "shipping" },
          { title: "Pickup", value: "pickup" },
          { title: "In Person", value: "inperson" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "pickupLocationId",
      title: "Pickup Location ID",
      type: "string",
    }),
    defineField({
      name: "pickupLocationName",
      title: "Pickup Location Name",
      type: "string",
    }),
    defineField({
      name: "stripePaymentIntentId",
      title: "Stripe Payment Intent ID",
      type: "string",
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notes",
      title: "Admin Notes",
      type: "text",
    }),
  ],
  preview: {
    select: {
      title: "orderNumber",
      status: "status",
      carrier: "shippingCarrier",
      trackingNumber: "trackingNumber",
    },
    prepare: ({ title, status, carrier, trackingNumber }) => ({
      title,
      subtitle: [status, trackingNumber && `${carrierTitle(carrier)} ${trackingNumber}`]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
