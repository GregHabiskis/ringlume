import { describe, expect, it } from 'vitest'
import seed from '../../../content/site/site.json'
import { getOffer, formatList } from '../offer'

describe('shared offer settings', () => {
	it('derives duration, delivery and preferred labels from the catalog', () => {
		const offer = getOffer(seed.offer)
		expect(offer.demoFreeMinutes).toBe(seed.offer.demoFreeMinutes)
		expect(offer.demoDeliveryMax).not.toMatch(/\{[^}]+\}/)
		expect(offer.supportedStack.phone).toEqual(Object.values(seed.offer.supportedStack.phone))
	})
	it('supports changed delivery hours without stale wording', () => {
		const offer = structuredClone(seed.offer)
		offer.demoDeliveryHours = 2
		offer.deliveryTemplate = '{hours} {hourUnit}'
		offer.hourPlural = 'hours'
		expect(getOffer(offer).demoDeliveryMax).toBe('2 hours')
	})
	it('joins fixed tool slots', () => {
		expect(formatList(['A'])).toBe('A')
		expect(formatList(['A', 'B'], 'and')).toBe('A and B')
		expect(formatList(['A', 'B', 'C'], 'and')).toBe('A, B, and C')
	})
})
