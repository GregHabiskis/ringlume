import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourceUrl = new URL('../FomoSection.astro', import.meta.url)
const readSource = () => readFile(sourceUrl, 'utf8')

const statCardTags = (source: string) =>
	[...source.matchAll(/<div\b[^>]*\bclass="([^"]*)"[^>]*>/g)]
		.filter((match) => match[1].split(/\s+/).includes('glass'))

describe('FOMO stat cards', () => {
	it('keeps both cards and the calculator in static markup', async () => {
		const source = await readSource()

		expect(statCardTags(source)).toHaveLength(2)
		expect(source).toContain('62%')
		expect(source).toContain('Unanswered Calls')
		expect(source).toContain('80%')
		expect(source).toContain('Instant Lead Decay')
		expect(source).toContain('<MissedCallCalculator />')
	})

	it('uses the existing blur-free glass fill on both cards', async () => {
		const cards = statCardTags(await readSource())
		expect(cards).toHaveLength(2)

		for (const card of cards) {
			expect(card[1].split(/\s+/)).toEqual(
				expect.arrayContaining(['glass-fill', 'glass-regular', 'grain']),
			)
		}
	})

	it('keeps cards visible without reveal or animated hover layers', async () => {
		const source = await readSource()
		const cards = statCardTags(source)
		expect(cards).toHaveLength(2)

		for (const card of cards) {
			const classes = card[1].split(/\s+/)
			for (const effect of [
				'reveal',
				'reveal-text',
				'specular',
				'lift-hover',
				'transition-shadow',
			]) {
				expect(classes).not.toContain(effect)
			}
		}

		expect(source).not.toContain('animate-pulse')
	})

	it('does not defer or lazy-load the section or add client scripts', async () => {
		const source = await readSource()
		const sectionTag = source.match(/<section\b[^>]*>/)?.[0] ?? ''

		expect(sectionTag).not.toContain('content-auto')
		expect(source).not.toContain('loading="lazy"')
		expect(source).not.toContain('<script')
		expect(source).not.toContain('client:')
	})
})
