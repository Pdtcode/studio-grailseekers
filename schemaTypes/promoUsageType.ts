import { defineField, defineType } from 'sanity'

export const promoUsageType = defineType({
  name: 'promoUsage',
  title: 'Promo Code Usage',
  type: 'document',
  icon: () => '📊',
  fields: [
    defineField({
      name: 'promoCode',
      title: 'Promo Code',
      type: 'reference',
      to: [{ type: 'promoCode' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'userId',
      title: 'User ID',
      type: 'string',
      description: 'Firebase user ID or session ID for anonymous users',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'userEmail',
      title: 'User Email',
      type: 'string',
      description: 'User email for tracking (if available)',
    }),
    defineField({
      name: 'userIP',
      title: 'IP Address',
      type: 'string',
      description: 'User IP address for fraud detection',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'userAgent',
      title: 'User Agent',
      type: 'string',
      description: 'Browser/device information',
    }),
    defineField({
      name: 'orderTotal',
      title: 'Order Total',
      type: 'number',
      description: 'Total order amount when code was used',
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: 'discountAmount',
      title: 'Discount Amount',
      type: 'number',
      description: 'Actual discount applied',
      validation: Rule => Rule.required().min(0),
    }),
    defineField({
      name: 'orderId',
      title: 'Order ID',
      type: 'string',
      description: 'Associated order ID (if order completed)',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Applied', value: 'applied' },
          { title: 'Order Completed', value: 'completed' },
          { title: 'Order Cancelled', value: 'cancelled' },
          { title: 'Refunded', value: 'refunded' },
        ],
      },
      initialValue: 'applied',
    }),
    defineField({
      name: 'usedAt',
      title: 'Used At',
      type: 'datetime',
      description: 'When the code was used',
      validation: Rule => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'metadata',
      title: 'Additional Metadata',
      type: 'text',
      description: 'Additional tracking data (JSON format)',
      rows: 3,
    }),
  ],

  preview: {
    select: {
      promoCode: 'promoCode.code',
      userEmail: 'userEmail',
      discountAmount: 'discountAmount',
      usedAt: 'usedAt',
      status: 'status',
    },
    prepare({ promoCode, userEmail, discountAmount, usedAt, status }) {
      const date = new Date(usedAt).toLocaleDateString()
      const statusEmoji = {
        applied: '⏳',
        completed: '✅',
        cancelled: '❌',
        refunded: '💸'
      }[status] || '❓'

      return {
        title: `${promoCode} - $${discountAmount}`,
        subtitle: `${statusEmoji} ${userEmail || 'Anonymous'} on ${date}`,
        media: () => '📊',
      }
    },
  },

  orderings: [
    {
      title: 'Most Recent',
      name: 'recentFirst',
      by: [{ field: 'usedAt', direction: 'desc' }],
    },
    {
      title: 'Highest Discount',
      name: 'highestDiscount',
      by: [{ field: 'discountAmount', direction: 'desc' }],
    },
  ],
})