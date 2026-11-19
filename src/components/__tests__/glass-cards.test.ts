import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const readComponent = (name: string) =>
	readFile(new URL(`../${name}.astro`, import.meta.url), 'utf8')
const readStyles = () =>
	readFile(new URL('../../styles/global.css', import.meta.url), 'utf8')

describe('uniform glass cards', () => {
	it('shares the exact pricing fill and keeps grey edges without dimming content', async () => {
		const css = await readStyles()
		const material =
			css.match(/\.glass\.glass-card \{([\s\S]*?)\n\}/)?.[1] ?? ''
		expect(css).toContain('--card-fill: rgba(14, 18, 27, 0.66)')
		const pricingFill =
			css.match(/\.glass-fill\.glass-regular \{([\s\S]*?)\n\}/)?.[1] ?? ''
		expect(pricingFill).toContain('--glass-fill-2: var(--card-fill)')
		expect(material).toContain('--glass-fill: var(--card-fill)')
		expect(material).toContain('--glass-fill-2: var(--glass-fill)')
		expect(material).toContain(
			'border: 1px solid color-mix(in srgb, var(--fg-3) 20%, transparent)',
		)
		expect(material).toContain(
			'--line: color-mix(in srgb, var(--fg-3) 12%, transparent)',
		)
		expect(material).toContain('backdrop-filter: none')
		expect(material).not.toMatch(
			/(?:^|\n)\s*opacity:|--glass-edge-hi|--glass-specular/,
		)
	})

	it('applies the same material to every pictured card without affecting unrelated surfaces', async () => {
		for (const name of [
			'DemoSection',
			'ReceptionistVisual',
			'MissedCallCalculator',
			'CtaSection',
			'ContactForm',
			'DemoRequestForm',
		]) {
			const source = await readComponent(name)
			expect(source, name).toContain(
				'glass glass-fill glass-regular glass-card',
			)
		}
		for (const name of [
			'Header',
			'Pricing',
			'ReceptionistComparison',
		]) {
			expect(await readComponent(name), name).not.toContain('glass-card')
		}
		const [demo, flow, cta] = await Promise.all(
			['DemoSection', 'ReceptionistVisual', 'CtaSection'].map(readComponent),
		)
		expect(demo).not.toContain('grain specular')
		expect(demo).not.toContain('--glass-fill:')
		expect(flow).not.toContain('background: linear-gradient')
		expect(cta).not.toContain('background: linear-gradient')
	})

	it.each([
		['book-demo/thanks', 'BookDemoThanksBody'],
		['contact/thanks', 'ContactThanksBody'],
	])(
		'matches the /%s confirmation card to the pricing fill without blur or grain',
		async (_page, body) => {
			const source = await readFile(
				new URL(`../cms-regions/forms/${body}.astro`, import.meta.url),
				'utf8',
			)
			expect(source).toContain('glass glass-fill glass-regular glass-card')
			expect(source).not.toContain('grain')
		},
	)

	it('matches FAQ and contact cards without changing the homepage FAQ preview', async () => {
		const [faq, contact, form] = await Promise.all([
			readComponent('FAQ'),
			readFile(new URL('../cms-regions/forms/ContactBody.astro', import.meta.url), 'utf8'),
			readComponent('ContactForm'),
		])
		expect(faq).toMatch(
			/compact\s*\? 'faq-list'\s*: 'glass glass-fill glass-regular glass-card rounded-3xl'/,
		)
		expect(faq).toContain('.glass-card [data-faq-trigger]:hover')
		expect(
			contact.match(
				/glass glass-fill glass-regular glass-card rounded-2xl p-8/g,
			),
		).toHaveLength(2)
		expect(contact).not.toMatch(/grain|lift-hover/)
		expect(form).toContain('glass glass-fill glass-regular glass-card')
		expect(form).not.toContain('grain')
	})

	it.each([['terms', 'TermsBody'], ['privacy', 'PrivacyBody']])(
		'matches the /%s legal card to homepage cards',
		async (_page, body) => {
			const source = await readFile(
				new URL(`../cms-regions/legal/${body}.astro`, import.meta.url),
				'utf8',
			)
			expect(source).toContain(
				'glass glass-fill glass-regular glass-card max-w-none space-y-10 rounded-[32px] p-6 sm:p-10 lg:p-14',
			)
			expect(source).not.toMatch(/glass-thick|grain/)
		},
	)

	it('avoids stacking tinted fills inside the calculator', async () => {
		const source = await readComponent('MissedCallCalculator')
		const output = source.match(/class="calc-output-card[^"]*"/)?.[0] ?? ''
		const panel = source.match(/\.calc-panel \{([\s\S]*?)\n\t\}/)?.[1] ?? ''
		expect(output).toContain('border-line')
		expect(output).not.toContain('glass-fill')
		expect(panel).not.toContain('background')
		expect(source).not.toContain('.calc-output-card {')
	})

	it('keeps the accessibility fallback opaque and legible', async () => {
		const css = await readStyles()
		const accessibility = css.slice(
			css.indexOf('@media (prefers-reduced-transparency: reduce)'),
		)
		expect(accessibility).toContain('.glass.glass-card')
		expect(accessibility).toContain('--glass-fill: rgba(8, 11, 18, 0.94)')
		expect(accessibility).toContain('border-color: var(--fg-3)')
	})
})
