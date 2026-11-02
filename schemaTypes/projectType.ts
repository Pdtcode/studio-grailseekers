import { defineArrayMember, defineField, defineType } from "sanity";

// An entry in the Grails section of the homepage: a project, collab or
// anything else worth showing off.
export default defineType({
  name: "project",
  title: "Grail",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 5,
      description:
        "What it is and the story behind it. A few real sentences also help the homepage show up on Google.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      description: "Newest entries show first.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      description: "The first image is shown largest.",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Image description",
              type: "string",
              description: "What's in the image, for Google and screen readers.",
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "video",
      title: "Video (optional)",
      type: "file",
      description: "An MP4 export of a reel. Keep it short: large files load slowly.",
      options: { accept: "video/mp4,video/webm" },
    }),
    defineField({
      name: "linkUrl",
      title: "Other link (optional)",
      type: "url",
      description: "A product page, SoundCloud set, article and so on.",
      validation: (Rule) => Rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "linkLabel",
      title: "Other link text",
      type: "string",
      description: 'For example "Listen on SoundCloud".',
      hidden: ({ parent }) => !parent?.linkUrl,
    }),
    defineField({
      name: "isActive",
      title: "Show on website",
      type: "boolean",
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "date", media: "images.0" },
  },
});
