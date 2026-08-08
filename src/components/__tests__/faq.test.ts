import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const faqSourceUrl = new URL('../FAQ.astro', import.meta.url)

describe('FAQ content', () => {
	it('includes the subscription upgrade and cancellation guidance', async () => {
		const source = await readFile(faqSourceUrl, 'utf8')

		expect(source).toContain('How do I upgrade my subscription plan?')
		expect(source).toContain('href: \'/contact\'')
		expect(source).toContain('within a few hours')
		expect(source).toContain('How do I cancel my subscription plan?')
		expect(source).toContain('href: \'/portal\'')
		expect(source).toContain('Manage or Cancel Subscription.')
	})

	it('keeps only the main FAQ heading above the accordion', async () => {
		const source = await readFile(faqSourceUrl, 'utf8')

		expect(source).not.toContain('Everything you need to know about Ringlume')
		expect(source).not.toContain(
			'Common questions about how Ringlume answers calls, qualifies leads, books appointments, handles urgent requests, and works alongside your team.',
		)
		expect(source).toContain('Frequently Asked')
	})

	it('preserves the accessible accordion wiring', async () => {
		const source = await readFile(faqSourceUrl, 'utf8')

		expect(source).toContain('data-faq-trigger')
		expect(source).toContain('aria-controls={answerId}')
		expect(source).toContain("event.key === 'ArrowDown'")
	});
});
