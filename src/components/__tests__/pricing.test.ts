import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { PLANS } from '../../lib/pricing'

const pricingSourceUrl = new URL('../Pricing.astro', import.meta.url)

describe('pricing CTAs', () => {
	it('limits the short setup explanation to detailed pricing and links to Terms', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		const summary = source.match(
			/\{\s*detailed && \([\s\S]*?data-setup-summary[\s\S]*?<\/p>\s*\)\s*\}/,
		)?.[0]
		expect(summary).toBeDefined()
		const text = summary?.replace(/\s+/g, ' ')
		expect(text).toContain(
			'We handle setup and testing, with launch timing agreed after review.',
		)
		expect(summary).toContain('href="/terms#setup-time"')
		expect(summary).not.toMatch(/\b\d+\s*(?:hours?|days?|weeks?)\b/i)
	})

	it('places one short setup-fee upgrade disclosure below the cards in both modes', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		const text = source.replace(/\s+/g, ' ')
		expect(text).toContain('Upgrading? Pay only the setup-fee difference.')
		expect(source).toContain('href="/terms#setup-fee-upgrades"')
		expect(source.indexOf('href="/terms#setup-fee-upgrades"')).toBeGreaterThan(
			source.indexOf('</article>'),
		)
		expect(source.match(/href="\/terms#setup-fee-upgrades"/g)).toHaveLength(1)
	})

	it('centers homepage billing and disclosure groups only below the sm breakpoint', async () => {
		const source = (await readFile(pricingSourceUrl, 'utf8')).replace(
			/\s+/g,
			' ',
		)
		expect(source).toContain(
			"!detailed && 'max-sm:flex-col max-sm:justify-center max-sm:text-center'",
		)
		expect(source).toContain(
			"!detailed && 'max-sm:items-center max-sm:text-center'",
		)
		expect(source).toContain('sm:flex-row sm:items-start sm:justify-between')
		expect(source).toContain('mobileAlignment.billing')
		expect(source).toContain('mobileAlignment.disclosure')
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

	it('omits CTA legal notices in both modes while preserving setup fees', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')

		expect(source).not.toContain('Subject to our')
		expect(source).not.toContain('cta-legal-notice-')
		expect(source).not.toContain('aria-describedby')
		expect(PLANS.map((plan) => plan.setupFee)).toEqual([800, 1000, 1200, 1200])
		expect(source).toContain('formatPrice(plan.setupFee)')
		expect(source).toContain('one-time Service Setup Fee')
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

	it('uses the exact requested savings badge color on the annual button in both modes', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8')
		const annualButton = source.match(
			/<button\s[^>]*id="annual-btn"[\s\S]*?<\/button/,
		)?.[0]
		expect(annualButton).toContain('relative min-h-11')
		expect(annualButton).toContain('absolute -top-3 right-0')
		expect(annualButton).toContain('text-white')
		expect(annualButton).toContain('Save ~17%')
		expect(source).toContain('background: var(--annual-discount-fill)')
		const css = await readFile(
			new URL('../../styles/global.css', import.meta.url),
			'utf8',
		)
		expect(css).toContain('--annual-discount-fill: #F50909EB')
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
		expect(source).toContain('href="/terms#setup-fee-upgrades"')
		expect(source).not.toContain('id="pricing"')
		expect(source).toContain("const Heading = detailed ? 'h1' : 'h2'")
		expect(source).toContain("detailed ? 'pb-16 lg:pb-24' : 'py-16 lg:py-24'")
		expect(source).not.toContain('24–48')
		expect(source).not.toContain('12 hours')
		expect(source).not.toContain('48 Hrs')
	})
})
