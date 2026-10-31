import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const readComponent = (name: string) =>
	readFile(new URL(`../${name}.astro`, import.meta.url), 'utf8')
const readStyles = () =>
	readFile(new URL('../../styles/global.css', import.meta.url), 'utf8')

describe('uniform glass cards', () => {
	it('uses one background alpha and grey edges without dimming content', async () => {
		const css = await readStyles()
		const material =
			css.match(/\.glass\.glass-card \{([\s\S]*?)\n\}/)?.[1] ?? ''
		expect(material).toContain(
			'--glass-fill: color-mix(in srgb, var(--bg-alt) 40%, transparent)',
		)
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
			'CapabilityCard',
			'MissedCallCalculator',
			'CtaSection',
			'ContactForm',
		]) {
			const source = await readComponent(name)
			expect(source, name).toContain(
				'glass glass-fill glass-regular glass-card',
			)
		}
		for (const name of ['Header', 'Pricing', 'DemoRequestForm']) {
			expect(await readComponent(name), name).not.toContain('glass-card')
		}
		const [demo, flow, cta] = await Promise.all(
			['DemoSection', 'CapabilityCard', 'CtaSection'].map(readComponent),
		)
		expect(demo).not.toContain('grain specular')
		expect(demo).not.toContain('--glass-fill:')
		expect(flow).not.toContain('background: linear-gradient')
		expect(cta).not.toContain('background: linear-gradient')
	})

	it('matches FAQ and contact cards without changing the homepage FAQ preview', async () => {
		const [faq, contact, form] = await Promise.all([
			readComponent('FAQ'),
			readFile(new URL('../../pages/contact.astro', import.meta.url), 'utf8'),
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
