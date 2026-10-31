import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourceUrl = new URL('../FomoSection.astro', import.meta.url)
const readSource = () => readFile(sourceUrl, 'utf8')

describe('missed-call section', () => {
	it('keeps the working calculator under an addressable FOMO section', async () => {
		const source = await readSource()
		expect(source).toContain('id="fomo"')
		expect(source).toContain('aria-labelledby="fomo-heading"')
		expect(source).toContain('<MissedCallCalculator />')
	})

	it('does not present unsourced statistics or guaranteed revenue losses', async () => {
		const source = await readSource()
		expect(source).not.toContain('62%')
		expect(source).not.toContain('80%')
		expect(source).not.toMatch(/gone forever|right now|Instant Lead Decay/)
		expect(source).toContain('potential revenue')
	})

	it('keeps the section static and defers its below-the-fold layout', async () => {
		const source = await readSource()
		expect(source).toContain('content-auto')
		expect(source).not.toContain('<script')
		expect(source).not.toContain('client:')
		expect(source).not.toContain('animate-pulse')
	})

	it('keeps the calculator blur-free, with its default result rendered on the server', async () => {
		const source = await readFile(
			new URL('../MissedCallCalculator.astro', import.meta.url),
			'utf8',
		)
		expect(source).toContain('glass glass-fill glass-regular')
		expect(source).toContain('formatCurrency(result.annual)')
		expect(source).toContain('Estimate only, not guaranteed revenue.')
		expect(source).toContain('href="/terms#estimates"')
	})
})
