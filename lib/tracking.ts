// Carriers offered for order shipments, with each one's public tracking page
export const CARRIERS = [
  { value: 'usps', title: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { value: 'ups', title: 'UPS', url: 'https://www.ups.com/track?tracknum=' },
  { value: 'fedex', title: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { value: 'dhl', title: 'DHL', url: 'https://www.dhl.com/global-en/home/tracking.html?tracking-id=' },
  { value: 'other', title: 'Other', url: '' },
] as const

export const carrierTitle = (carrier?: string) =>
  CARRIERS.find((c) => c.value === carrier)?.title ?? carrier ?? ''

/**
 * Link to the carrier's tracking page. "Other" carriers (and any order with a
 * link typed in) use the saved tracking URL instead.
 */
export function trackingLink(carrier?: string, trackingNumber?: string, trackingUrl?: string) {
  if (trackingUrl) return trackingUrl
  const base = CARRIERS.find((c) => c.value === carrier)?.url
  const number = trackingNumber?.replace(/\s+/g, '')
  return base && number ? base + encodeURIComponent(number) : undefined
}
