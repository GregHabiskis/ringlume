import { describe, expect, it } from 'vitest'
import {
	CAL_BOOKING_URL,
	DEMO_DELIVERY_MAX,
	DEMO_FREE_MINUTES,
	formatList,
	PRODUCTION_MAX,
	SETUP_FAST_PHRASE,
	SETUP_QUALIFIER,
	SUPPORTED_STACK,
} from '../offer'

describe('offer facts', () => {
	it('keeps the approved wording and numbers', () => {
		expect(SETUP_FAST_PHRASE).toBe('Go live in an afternoon')
		expect(SETUP_QUALIFIER).toBe('under best circumstances')
		expect(DEMO_DELIVERY_MAX).toBe('1 hour')
		expect(PRODUCTION_MAX).toBe('12 hours')
		expect(DEMO_FREE_MINUTES).toBe(10)
	})

	it('keeps one booking URL', () => {
		expect(CAL_BOOKING_URL).toBe('https://cal.com/ringlume/meeting')
	})

	it('lists the preferred tools in the agreed groups', () => {
		expect(SUPPORTED_STACK).toEqual({
			phone: ['a VoIP number from Ringlume', 'Twilio', 'Telnyx'],
			calendar: ['Google Calendar'],
			booking: ['Cal.com', 'Calendly'],
			crm: ['HubSpot', 'Salesforce', 'Zoho CRM', 'GoHighLevel'],
		})
	})

	it('joins lists the way the copy reads', () => {
		expect(formatList(['Google Calendar'])).toBe('Google Calendar')
		expect(formatList(['Cal.com', 'Calendly'])).toBe('Cal.com or Calendly')
		expect(formatList(['Twilio', 'Telnyx', 'Ringlume'])).toBe(
			'Twilio, Telnyx, or Ringlume',
		)
	})
})
