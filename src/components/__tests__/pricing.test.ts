import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const pricingSourceUrl = new URL('../Pricing.astro', import.meta.url)

describe('pricing CTAs', () => {
	it('offers the free demo on every plan', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source.match(/name: '(Basic|Pro|Plus|Max)'/g)).toHaveLength(4)
		expect(source.match(/cta: 'Get Your Free Demo'/g)).toHaveLength(4)
		expect(source).toContain('href="/book-demo"')
		expect(source).not.toContain('cal.com')
		expect(source).not.toContain('Contact Sales')
	})

	it('keeps the legal acceptance notice next to every CTA', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).toContain('aria-describedby={`cta-legal-notice-${plan.name.toLowerCase()}`}')
		expect(source).toContain('id={`cta-legal-notice-${plan.name.toLowerCase()}`}')
		expect(source).toContain('Terms of Service')
		expect(source).toContain('href="/terms"')
		expect(source).toContain('Privacy Policy')
		expect(source).toContain('href="/privacy"')
		expect(source).toContain("setupFee: '$1,200'")
		expect(source).toContain('+ {plan.setupFee} one-time Service Setup Fee')
		expect(source).not.toContain('Voice AI Setup Fee')
		expect(source).not.toContain('/refund')
		expect(source).not.toMatch(/refund/i)
	})

	it('has no payment provider wiring left in the section', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).not.toMatch(/paddle/i)
		expect(source).not.toContain('data-checkout-button')
		expect(source).not.toContain('priceId')
	})

	it('keeps the setup disclosure subtle and linked to the Terms', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).toContain('{SETUP_FAST_PHRASE}')
		expect(source).toContain('{SETUP_QUALIFIER}')
		expect(source).toContain('href="/terms#setup-time"')
		expect(source).toContain('font-display text-base text-fg-1')
		expect(source).toContain('text-xs text-fg-3')
		expect(source).not.toContain('24–48')
		expect(source).not.toContain('12 hours')
		expect(source).not.toContain('48 Hrs')
	})
})
