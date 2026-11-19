import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { PLANS } from '../../lib/pricing'

const srcDir = new URL('../../', import.meta.url)

const read = (path: string) => readFile(new URL(path, srcDir), 'utf8')

const component = (name: string) => read(`components/${name}.astro`)

const sourceFiles = async () => {
	const entries = await readdir(srcDir, { recursive: true })
	return entries.filter(
		(entry) => /\.(astro|ts|md)$/.test(entry) && !entry.includes('__tests__'),
	)
}

describe('demo-first CTAs', () => {
	it('keeps only the personalized-demo CTA beside the hero demo card', async () => {
		const source = await component('Hero')
		const copy = await read('components/tina/HeroCopy.astro')

		expect(copy).toContain('href={site.links.freeDemo}')
		expect(copy).toContain('site.shared.getFreeDemo')
		expect(source).toContain('<DemoSection />')
		expect(source).not.toContain('#demo')
		expect(source).not.toContain('btn-secondary')
		expect(source).not.toContain('Get Started Today')
		expect(source).not.toContain('48 Hrs')
		expect(source).not.toContain('Setup Time')
	})

	it('builds the hero stat from the shared free-minute fact', async () => {
		const source = await read('components/tina/HeroCopy.astro')

		expect(source).toContain('offer.demoFreeMinutes')
		expect(source).toContain('copy.freeDemo')
		expect(source).toContain('copy.alwaysValue')
		expect(source).toContain('copy.alwaysWorking')
		expect(source).not.toContain('>10 Min<')
	})

	it('binds header demo, pricing, and CTA destinations to shared links', async () => {
		const source = await component('Header')

		expect(source).toContain('label: copy.nav.demo, href: destinations.liveDemo')
		expect(source).toContain('label: copy.nav.pricing, href: destinations.pricing')
		expect(source).not.toContain('/#pricing')
		expect(source).toContain('href={destinations.freeDemo}')
		expect(source).toContain('copy.nav.freeDemo')
		expect(source).not.toContain('Try a Demo')
		expect(source).not.toContain('Get Started')
	})

	it('uses Try it now for the inline demo button and reset label', async () => {
		const source = await component('DemoSection')
		expect(source).toContain('data-demo-label')
		expect(source).not.toContain('retell-widget')
	})

	it('points every pricing CTA at the demo request', async () => {
		const source = await component('Pricing')

		expect(PLANS).toHaveLength(4)
		expect(source).toContain('plans.map((plan) => (')
		expect(source).toContain('site.shared.getFreeDemo')
		// One href inside the shared plan loop, rendered on all four cards.
		expect(source.match(/href=\{site.links.freeDemo\}/g)).toHaveLength(1)
		expect(source).not.toContain('cal.com')
		expect(source).not.toContain('Contact Sales')
	})

	it('keeps the pre-footer CTA demo-first and sends talkers to /contact', async () => {
		const source = await component('CtaSection')

		expect(source).toContain('href={site.links.freeDemo}')
		expect(source).toContain('site.shared.getFreeDemo')
		expect(source).toContain('href={site.links.contact}')
		expect(source).toContain('copy.contact')
		expect(source).not.toContain('wa.me')
		expect(source).not.toContain('mailto:')
		expect(source).not.toContain('Contact Us on WhatsApp')
		expect(source).not.toContain('Send an Email')
	})

	it('adds the personalized demo link inside the Retell section', async () => {
		const source = await component('DemoSection')
		const guard = source.indexOf('retell && (')
		const link = source.indexOf('href={site.links.freeDemo}')
		const style = source.indexOf('<style>')

		expect(guard).toBeGreaterThan(-1)
		expect(link).toBeGreaterThan(guard)
		expect(link).toBeLessThan(style)
		expect(source).toContain('href={site.links.freeDemo}')
	})

	it('adds the footer demo link without contact channels', async () => {
		const source = await component('Footer')

		expect(source).toContain('label: copy.footer.freeDemo, href: destinations.freeDemo')
		expect(source).not.toContain('wa.me')
		expect(source).not.toContain('mailto:')
	})

	it('leaves no legacy CTA labels or cal.com literals in source', async () => {
		const files = await sourceFiles()

		for (const file of files) {
			const source = await readFile(new URL(file, srcDir), 'utf8')

			expect(source, file).not.toContain('Contact Sales')
			expect(source, file).not.toContain('Get Started Today')
			expect(source, file).not.toContain('Try a Demo')
			expect(source, file).not.toContain('Contact Us on WhatsApp')
			expect(source, file).not.toContain('Send an Email')

			expect(source, file).not.toContain('https://cal.com')
		}
	})
})
