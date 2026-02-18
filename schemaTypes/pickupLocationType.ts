import { defineField, defineType } from "sanity";

export default defineType({
  name: "pickupLocation",
  title: "Pickup Location",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "street",
      title: "Street Address",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "state",
      title: "State",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "zip",
      title: "Zip Code",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      description: "Inactive locations do not appear in the pickup selector",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "city",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Unnamed Location",
        subtitle: subtitle || "No city set",
      };
    },
  },
});
