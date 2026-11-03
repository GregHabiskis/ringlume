import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { VISUAL_CONVERSATION } from '../../lib/receptionist-visual'

const read = (file: string) =>
	readFile(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('homepage redesign', () => {
	it('animates the decorative waveform and rim without animating layout or paint properties', async () => {
		const source = await read('components/DemoSection.astro')
		expect(source).toContain('class="signal-stage" aria-hidden="true"')
		expect(source).toContain('--wave-delay:')
		expect(source).toContain('--wave-duration:')
		expect(source).toContain('animation: signal-orbit 18s linear infinite')
		for (const name of ['signal-wave', 'signal-orbit']) {
			const frames =
				source.match(
					new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\t\\}`),
				)?.[1] ?? ''
			expect(frames).toContain('transform:')
			expect(frames).not.toMatch(
				/(?:height|width|filter|box-shadow|background)\s*:/,
			)
		}
	})

	it('stops waveform and rim motion for reduced motion and hidden tabs', async () => {
		const source = await read('components/DemoSection.astro')
		expect(source).toContain(':global(html.is-paused) .signal-lens::before')
		expect(source).toContain(':global(html.is-paused) .signal-core span')
		const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
		const reducedMotion = styles.slice(
			styles.indexOf('@media (prefers-reduced-motion: reduce)'),
		)
		expect(reducedMotion).toContain('.signal-lens::before,')
		expect(reducedMotion).toContain('.signal-core span')
		expect(reducedMotion).toContain('animation: none')
	})

	it('centers hero facts in equal columns on mobile without changing wider layouts', async () => {
		const hero = await read('components/Hero.astro')
		const facts = hero.match(/<dl\b[\s\S]*?<\/dl>/)?.[0] ?? ''
		expect(facts).toContain('max-sm:gap-0 max-sm:text-center')
		expect(facts.match(/max-sm:flex-1/g)).toHaveLength(2)
		expect(facts).toContain('max-sm:pl-0 sm:pl-10')
		expect(facts).toContain('sm:gap-10')
	})

	it('puts the demo in the hero and missed-call calculator below pricing', async () => {
		const [page, hero] = await Promise.all([
			read('pages/index.astro'),
			read('components/Hero.astro'),
		])
		expect(hero).toContain('<DemoSection />')
		expect(page).not.toContain('<DemoSection />')
		const sections = [
			'<Hero />',
			'<ReceptionistVisual />',
			'<ReceptionistComparison />',
			'<Pricing />',
			'<FomoSection />',
			'<FAQ ',
			'<CtaSection />',
		]
		const positions = sections.map((section) => page.indexOf(section))
		expect(positions.every((position) => position >= 0)).toBe(true)
		expect(positions).toEqual([...positions].sort((a, b) => a - b))
		expect(page).toContain('An AI receptionist for arborists.')
		expect(page).not.toContain('Capabilities')
	})

	it('keeps Retell on-demand, with reduced-motion support and a load-error message', async () => {
		const source = await read('components/DemoSection.astro')
		expect(source).toContain('retell && (')
		expect(source).toContain('id="demo"')
		expect(source).toContain('data-demo-open')
		expect(source).toContain('data-demo-status')
		expect(source).toContain('The demo could not load.')
		expect(source).toContain('prefers-reduced-motion: reduce')
		expect(source).toContain('html.is-paused')
		expect(source).not.toContain('content-auto')
		expect(source).not.toMatch(/<script[^>]*src=/)
		expect(source).toContain('inject(config)')
	})

	it('cites the wage benchmark and states the comparison limits', async () => {
		const source = await read('components/ReceptionistComparison.astro')
		expect(source).toContain('annualMedianWage = 38010')
		expect(source).toContain('Math.round(annualMedianWage / 12)')
		expect(source).toContain(
			'https://www.onetonline.org/link/summary/43-4171.00#WagesEmployment',
		)
		expect(source).toContain('2025 BLS median wage')
		expect(source).toMatch(/not guaranteed savings/i)
		expect(source).toMatch(/does not replace\s+in-person duties/)
		expect(source).toContain('formatPrice(basic.monthly)')
		expect(source).not.toContain('basic.setupFee')
		expect(source).not.toContain('basic.minutes')
	})

	it('uses clearly labelled tree-care examples instead of fabricated social proof', async () => {
		const features = (
			await read('components/ReceptionistVisual.astro')
		).replace(/\s+/g, ' ')
		expect(features).toContain('Illustrative example')
		expect(
			VISUAL_CONVERSATION.some(({ text }) => text.includes('oak')),
		).toBe(true)
		expect(features).toContain('Oak removal')
		expect(features).not.toContain('Answered in 1.2s')
		expect(features).toContain('getVisualFrame')
		expect(features).not.toMatch(/<script[^>]*src=/)
		expect(features).toContain('prefers-reduced-motion: reduce')
	})
})
