import { defineField, defineType } from "sanity";

/**
 * Settings for the password page shown before the website.
 *
 * There is exactly one of these, with the fixed id `settings.siteProtection`
 * (see sanity.config.ts). The dot in the id keeps it out of the public API, so
 * the password can only be read by Studio users and the website's server.
 */
export default defineType({
  name: "siteProtection",
  title: "Site Password",
  type: "document",
  fields: [
    defineField({
      name: "enabled",
      title: "Password page on",
      type: "boolean",
      description:
        "ON: visitors must enter the password before they see the website. OFF: the website is open to everyone. Takes up to a minute to apply after publishing.",
      initialValue: true,
    }),
    defineField({
      name: "password",
      title: "Password",
      type: "string",
      description:
        "The password visitors type in. Changing it signs out everyone who entered the old one.",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.document as { enabled?: boolean } | undefined)?.enabled;

          if (enabled && !value?.trim()) {
            return "Set a password, or turn the password page off";
          }

          return true;
        }),
    }),
  ],
  preview: {
    select: { enabled: "enabled" },
    prepare({ enabled }) {
      return {
        title: "Site Password",
        subtitle: enabled ? "🔒 Password page on" : "🔓 Website open to everyone",
      };
    },
  },
});
