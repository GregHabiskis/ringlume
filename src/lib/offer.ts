// Public offer facts. Change these here, never inline in components.
export const SETUP_FAST_PHRASE = 'Go live in an afternoon'
export const SETUP_QUALIFIER = 'under best circumstances'
export const DEMO_DELIVERY_MAX = '1 hour'
export const PRODUCTION_MAX = '12 hours'
export const DEMO_FREE_MINUTES = 10

// Single source for the sales/booking link. Used by /terms and
// /book-demo/thanks only.
export const CAL_BOOKING_URL = 'https://cal.com/ringlume/meeting'

export const SUPPORTED_STACK = {
	phone: ['a VoIP number from Ringlume', 'Twilio', 'Telnyx'],
	calendar: ['Google Calendar'],
	booking: ['Cal.com', 'Calendly'],
	crm: ['HubSpot', 'Salesforce', 'Zoho CRM', 'GoHighLevel'],
} as const

// "A, B, or C" (and "A or B" for two items) so the Terms and FAQ read
// the same wherever the stack is listed.
export function formatList(items: readonly string[]): string {
	if (items.length <= 1) return items.join('')
	if (items.length === 2) return items.join(' or ')
	return `${items.slice(0, -1).join(', ')}, or ${items.at(-1) ?? ''}`
}
