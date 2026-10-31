import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { PLANS } from '../../lib/pricing'

const pricingSourceUrl = new URL('../Pricing.astro', import.meta.url)

describe('pricing CTAs', () => {
	it('centers homepage billing and disclosure groups only below the sm breakpoint', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		expect(source).toContain(
			"!detailed && 'max-sm:flex-col max-sm:justify-center max-sm:text-center'",
		)
		expect(source).toContain(
			"!detailed && 'max-sm:items-center max-sm:text-center'",
		)
		expect(source).toContain('sm:flex-row sm:items-start sm:justify-between')
	})

	it('offers the free demo on every plan', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(PLANS.map((plan) => plan.name)).toEqual([
			'Basic',
			'Pro',
			'Plus',
			'Max',
		])
		expect(source).toContain('PLANS.map((plan) => (')
		expect(source).toContain('Get Your Free Demo')
		expect(source).toContain('href="/book-demo"')
		expect(source).not.toContain('cal.com')
		expect(source).not.toContain('Contact Sales')
	})

	it('keeps the legal acceptance notice next to every CTA', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).toContain(
			'aria-describedby={`cta-legal-notice-${plan.name.toLowerCase()}`}',
		)
		expect(source).toContain(
			'id={`cta-legal-notice-${plan.name.toLowerCase()}`}',
		)
		expect(source).toContain('Terms of Service')
		expect(source).toContain('href="/terms"')
		expect(source).toContain('Privacy Policy')
		expect(source).toContain('href="/privacy"')
		expect(PLANS.map((plan) => plan.setupFee)).toEqual([800, 1000, 1200, 1200])
		expect(source).toContain('formatPrice(plan.setupFee)')
		expect(source).toContain('one-time Service Setup Fee')
		expect(source).not.toContain('Voice AI Setup Fee')
		expect(source).not.toContain('/refund')
		expect(source).not.toMatch(/refund/i)
	})

	it('shows five plain-English benefits and links to full pricing', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		for (const plan of PLANS) {
			expect(plan.benefits).toHaveLength(5)
			expect(plan.benefits.join(' ')).not.toMatch(/CRM|HIPAA|SOC 2|concurrent/i)
		}
		expect(source).toContain('plan.benefits.map')
		expect(source).toContain('plan.overagePerMinute.toFixed(2)')
		expect(source).toContain("href: '#plan-comparison'")
		expect(source).toContain("href: '/pricing'")
		expect(source).toContain('href={detailsLink.href}')
		expect(source).toContain('Explore full pricing')
	})

	it('keeps accessible monthly and annual controls with explicit billing totals', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		expect(source).toContain('id="monthly-btn"')
		expect(source).toContain('id="annual-btn"')
		expect(source).toContain('aria-pressed="true"')
		expect(source).toContain('aria-pressed="false"')
		expect(source).toContain('data-annual-monthly-display=')
		expect(source).toContain('data-annual-billing-display=')
		expect(source).toContain('formatPrice(plan.annualTotal)')
		expect(source).toContain("setAttribute('aria-pressed', String(annual))")
	})

	it('has no payment provider wiring left in the section', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).not.toMatch(/paddle/i)
		expect(source).not.toContain('data-checkout-button')
		expect(source).not.toContain('priceId')
	})

	it('removes the setup-time slogans while keeping the fees and legal links', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).not.toMatch(
			/SETUP_FAST_PHRASE|SETUP_QUALIFIER|afternoon|under best circumstances/,
		)
		expect(source).toContain('formatPrice(plan.setupFee)')
		expect(source).toContain('href="/terms"')
		expect(source).not.toContain('id="pricing"')
		expect(source).toContain("const Heading = detailed ? 'h1' : 'h2'")
		expect(source).toContain("detailed ? 'pb-16 lg:pb-24' : 'py-16 lg:py-24'")
		expect(source).not.toContain('24–48')
		expect(source).not.toContain('12 hours')
		expect(source).not.toContain('48 Hrs')
	})
})
