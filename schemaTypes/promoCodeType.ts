import { defineField, defineType } from 'sanity'

export const promoCodeType = defineType({
  name: 'promoCode',
  title: 'Promo Code',
  type: 'document',
  icon: () => '🏷️',
  fields: [
    defineField({
      name: 'code',
      title: 'Promo Code',
      type: 'string',
      description: 'The code customers will enter (e.g., SAVE20, WELCOME10)',
      validation: Rule => Rule.required().min(3).max(20).regex(/^[A-Z0-9]+$/, {
        name: 'uppercase alphanumeric',
        invert: false
      }),
    }),
    defineField({
      name: 'title',
      title: 'Internal Title',
      type: 'string',
      description: 'Internal name for this promo code',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'Customer-facing description of the discount',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Discount Type',
      type: 'string',
      options: {
        list: [
          { title: 'Percentage', value: 'percentage' },
          { title: 'Fixed Amount', value: 'fixed' },
          { title: 'Free Shipping', value: 'freeShipping' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
      initialValue: 'percentage',
    }),
    defineField({
      name: 'value',
      title: 'Discount Value',
      type: 'number',
      description: 'For percentage: enter as whole number (e.g., 10 for 10%). For fixed: enter dollar amount.',
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Toggle to enable/disable this promo code',
      initialValue: true,
    }),
    defineField({
      name: 'validFrom',
      title: 'Valid From',
      type: 'datetime',
      description: 'When this promo code becomes active (optional)',
    }),
    defineField({
      name: 'validUntil',
      title: 'Valid Until',
      type: 'datetime',
      description: 'When this promo code expires (optional)',
    }),
    defineField({
      name: 'minOrderAmount',
      title: 'Minimum Order Amount',
      type: 'number',
      description: 'Minimum order total required to use this code (optional)',
      validation: Rule => Rule.min(0),
    }),
    defineField({
      name: 'maxDiscount',
      title: 'Maximum Discount Amount',
      type: 'number',
      description: 'Maximum discount for percentage codes (optional)',
      validation: Rule => Rule.min(0),
      hidden: ({ document }) => document?.type !== 'percentage',
    }),
    defineField({
      name: 'usageLimit',
      title: 'Usage Limit',
      type: 'number',
      description: 'Total number of times this code can be used (optional)',
      validation: Rule => Rule.min(1),
    }),
    defineField({
      name: 'usedCount',
      title: 'Times Used',
      type: 'number',
      description: 'Number of times this code has been used (auto-updated)',
      initialValue: 0,
      readOnly: true,
    }),
    defineField({
      name: 'customerLimit',
      title: 'Uses Per Customer',
      type: 'number',
      description: 'How many times each customer can use this code (optional)',
      validation: Rule => Rule.min(1),
    }),
    defineField({
      name: 'applicableProducts',
      title: 'Applicable Products',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      description: 'Leave empty to apply to all products',
    }),
    defineField({
      name: 'applicableCategories',
      title: 'Applicable Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      description: 'Leave empty to apply to all categories',
    }),
    defineField({
      name: 'discountsServiceFee',
      title: 'Discount Service Fee',
      type: 'boolean',
      description: 'Enable this to allow this promo code to discount the 5% service fee',
      initialValue: false,
    }),
    defineField({
      name: 'serviceFeeDiscountType',
      title: 'Service Fee Discount Type',
      type: 'string',
      options: {
        list: [
          { title: 'Percentage Off Service Fee', value: 'percentage' },
          { title: 'Fixed Amount Off Service Fee', value: 'fixed' },
        ],
        layout: 'radio',
      },
      initialValue: 'percentage',
      hidden: ({ document }) => !document?.discountsServiceFee,
    }),
    defineField({
      name: 'serviceFeeDiscountValue',
      title: 'Service Fee Discount Value',
      type: 'number',
      description: 'For percentage: enter as whole number (e.g., 100 for 100% off). For fixed: enter dollar amount.',
      validation: Rule => Rule.min(0),
      hidden: ({ document }) => !document?.discountsServiceFee,
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      description: 'Internal notes about this promo code',
      rows: 3,
    }),
  ],

  preview: {
    select: {
      title: 'code',
      subtitle: 'description',
      isActive: 'isActive',
      type: 'type',
      value: 'value',
    },
    prepare({ title, subtitle, isActive, type, value }) {
      const status = isActive ? '✅' : '❌'
      const discountText = type === 'percentage' ? `${value}%` :
                          type === 'fixed' ? `$${value}` :
                          'Free Shipping'

      return {
        title: `${title} (${discountText})`,
        subtitle: `${status} ${subtitle}`,
        media: () => '🏷️',
      }
    },
  },

  orderings: [
    {
      title: 'Code A-Z',
      name: 'codeAsc',
      by: [{ field: 'code', direction: 'asc' }],
    },
    {
      title: 'Active Status',
      name: 'activeFirst',
      by: [
        { field: 'isActive', direction: 'desc' },
        { field: 'code', direction: 'asc' },
      ],
    },
    {
      title: 'Created (newest first)',
      name: 'createdDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
  ],
})