import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const readPage = () =>
	readFile(new URL('../pricing.astro', import.meta.url), 'utf8')

describe('dedicated pricing page', () => {
	it('uses the shared plans and full accessible comparison table', async () => {
		const source = await readPage()
		expect(source).toContain('<Pricing detailed />')
		expect(source).toContain("from '../lib/pricing'")
		expect(source).toContain('id="plan-comparison"')
		expect(source).toContain('overflow-x-auto')
		expect(source).toContain('tabindex="0"')
		expect(source).toContain('scope="col"')
		expect(source).toContain('scope="row"')
		expect(source).toContain('<caption')
		for (const field of [
			'annualTotal',
			'setupFee',
			'minutes',
			'overagePerMinute',
			'concurrentCalls',
			'phoneNumbers',
			'agents',
			'integrations',
			'multilingual',
			'support',
		]) {
			expect(source).toContain(`plan.${field}`)
		}
	})

	it('moves technical explanations into Terms without adding checkout wiring', async () => {
		const source = await readPage()
		expect(source).toContain('href="/terms#billing-details"')
		expect(source).not.toContain('Connections & requirements')
		expect(source).not.toContain('Usage & billing')
		expect(source).not.toMatch(/HIPAA|SOC 2|GDPR|data-checkout|paddle|stripe/i)
		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('<Header />')
		expect(source).toContain('<Footer />')
	})

	it('removes the duplicate introduction so the shared pricing heading comes first', async () => {
		const source = await readPage()
		expect(source).not.toContain('The right coverage.')
		expect(source).not.toContain('With the costs in clear view.')
		expect(source).not.toContain('Four plans. A free personalized demo')
		expect(source).toMatch(/<main[^>]*>\s*<Pricing detailed \/>/)
	})

	it('freezes an opaque first column only on mobile within the scrollable table', async () => {
		const source = await readPage()
		const mobile = source.slice(source.indexOf('@media (width < 40rem)'))
		expect(source).toContain('overflow-x-auto')
		expect(source).toContain('border-separate border-spacing-0')
		expect(source).toContain('scope="row"')
		expect(source).toContain('scope="col"')
		expect(mobile).toContain('.plan-table tr > :first-child')
		expect(mobile).toContain('position: sticky')
		expect(mobile).toContain('left: 0')
		expect(mobile).toContain('background: var(--bg-alt)')
		expect(mobile).toContain('width: 10rem')
		expect(mobile).toContain('z-index: 2')
	})
})
