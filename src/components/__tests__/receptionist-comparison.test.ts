import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const readComparison = () =>
	readFile(new URL('../ReceptionistComparison.astro', import.meta.url), 'utf8')

describe('homepage receptionist comparison', () => {
	it('removes the crossed-out offer details and duplicate price while keeping the demo CTA', async () => {
		const source = await readComparison()
		expect(source).not.toMatch(
			/offer-amount|comparison-offer|comparison-setup|comparison-usage/,
		)
		expect(source).not.toMatch(
			/basic.setupFee|basic.minutes|basic.overagePerMinute|24\/7 answering/,
		)
		expect(source.match(/formatPrice\(basic.monthly\)/g)).toHaveLength(1)
		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('Get Your Free Demo')
	})

	it('keeps the heading and CTA beside a single comparison on desktop and stacked on mobile', async () => {
		const source = await readComparison()
		expect(source).toContain("grid-template-areas: 'intro' 'benchmark' 'notes'")
		expect(source).toContain('@media (min-width: 1024px)')
		expect(source).toContain(
			"grid-template-areas: 'intro benchmark' 'notes notes'",
		)
		expect(source.indexOf('href="/book-demo"')).toBeLessThan(
			source.indexOf('</header>'),
		)
	})

	it('enlarges the one remaining Ringlume price to the wage display scale', async () => {
		const source = await readComparison()
		expect(source).toContain('class="comparison-price"')
		expect(source).toMatch(
			/\.wage-value,\s*\.comparison-price \{\s*font-size: clamp\(3rem, 5.8vw, 4.5rem\)/,
		)
		expect(source).toContain('aria-describedby="comparison-plan-label"')
		expect(source).toContain('id="comparison-plan-label"')
		expect(source).toMatch(/\.comparison-price \{\s*color: var\(--brand-text\)/)
	})

	it('derives the cost-bar scale from the displayed monthly prices without claiming savings', async () => {
		const source = await readComparison()
		expect(source).toContain('basic.monthly / monthlyMedianWage')
		expect(source).toContain('--offer-share: ${basicMonthlyShare}%')
		expect(source).toContain('width: var(--offer-share)')
		expect(source).toContain('Receptionist wages alone')
		expect(source).toContain('formatPrice(monthlyMedianWage)')
		expect(source).toContain('Not guaranteed savings.')
		expect(source).toContain('Wages exclude benefits and payroll taxes.')
		expect(source).toContain('href="/terms#estimates"')
	})

	it('highlights the labelled wage benchmark with a light-red diagonal strike, not a former offer price', async () => {
		const source = await readComparison()
		expect(source).toMatch(
			/class="wage-value">\{formatPrice\(monthlyMedianWage\)\}/,
		)
		expect(source).toContain('aria-describedby="comparison-wage-label"')
		expect(source).toContain('id="comparison-wage-label"')
		expect(source).toContain('Receptionist wages alone')
		expect(source).toContain('.wage-price-tag::after')
		expect(source).toContain('border-top: 5px solid var(--danger)')
		expect(source).toContain('transform: rotate(-9deg)')
		expect(source).toContain('font-size: clamp(3rem, 5.8vw, 4.5rem)')
		expect(source).not.toMatch(/<del\b|<s\b|was\s+\$|sale price/i)
	})

	it('keeps the compact offer card-free without glow or extra client code', async () => {
		const source = await readComparison()
		expect(source).not.toMatch(
			/glass-card|glass-fill|rounded-4xl|container-type/,
		)
		expect(source).toContain(
			'class="comparison-cta btn mt-6 bg-brand text-brand-ink hover:bg-brand-bright"',
		)
		expect(source).toContain('content-auto py-12 lg:py-16')
		expect(source).toContain('content-auto')
		expect(source).toContain('aria-hidden="true"')
		expect(source).toContain('prefers-contrast: more')
		expect(source).not.toMatch(
			/<script|btn-primary|text-shadow|box-shadow|filter:|animation:|@keyframes|glow/i,
		)
	})
})
