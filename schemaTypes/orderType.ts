import { defineField, defineType } from "sanity";

export default defineType({
  name: "order",
  title: "Order",
  type: "document",
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
      subtitle: "status",
    },
  },
});
