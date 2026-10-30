import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../../', import.meta.url)

const read = (path: string) => readFile(new URL(path, srcDir), 'utf8')

const component = (name: string) => read(`components/${name}.astro`)

const sourceFiles = async () => {
	const entries = await readdir(srcDir, { recursive: true })
	return entries.filter(
		(entry) =>
			/\.(astro|ts|md)$/.test(entry) && !entry.includes('__tests__'),
	)
}

describe('demo-first CTAs', () => {
	it('points the hero at the demo request and keeps live vs personalized distinct', async () => {
		const source = await component('Hero')

		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('Get Your Free Demo')
		expect(source).toContain("href={retell ? '#demo' : '#capabilities'}")
		expect(source).toContain("'Try the Live Demo'")
		expect(source).not.toContain('Get Started Today')
		expect(source).not.toContain('48 Hrs')
		expect(source).not.toContain('Setup Time')
	})

	it('builds the hero stat from the shared free-minute fact', async () => {
		const source = await component('Hero')

		expect(source).toContain('{DEMO_FREE_MINUTES} Min')
		expect(source).toContain('>Free Demo<')
		expect(source).toContain('>24/7<')
		expect(source).toContain('Always Working')
		expect(source).not.toContain('>10 Min<')
	})

	it('renames the header demo anchor and points its CTA at /book-demo', async () => {
		const source = await component('Header')

		expect(source).toContain("{ label: 'Live Demo', href: '/#demo' }")
		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('Free Demo')
		expect(source).not.toContain('Try a Demo')
		expect(source).not.toContain('Get Started')
	})

	it('points every pricing CTA at the demo request', async () => {
		const source = await component('Pricing')

		expect(source.match(/name: '(Basic|Pro|Plus|Max)'/g)).toHaveLength(4)
		expect(source.match(/cta: 'Get Your Free Demo'/g)).toHaveLength(4)
		// One href inside the plans.map loop, rendered on all four cards.
		expect(source.match(/href="\/book-demo"/g)).toHaveLength(1)
		expect(source).not.toContain('cal.com')
		expect(source).not.toContain('Contact Sales')
	})

	it('keeps the pre-footer CTA demo-first and sends talkers to /contact', async () => {
		const source = await component('CtaSection')

		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('Get Your Free Demo')
		expect(source).toContain('href="/contact"')
		expect(source).toContain('Contact Us')
		expect(source).not.toContain('wa.me')
		expect(source).not.toContain('mailto:')
		expect(source).not.toContain('Contact Us on WhatsApp')
		expect(source).not.toContain('Send an Email')
	})

	it('adds the personalized demo link inside the Retell section', async () => {
		const source = await component('DemoSection')
		const guard = source.indexOf('retell && (')
		const link = source.indexOf('href="/book-demo"')
		const style = source.indexOf('<style>')

		expect(guard).toBeGreaterThan(-1)
		expect(link).toBeGreaterThan(guard)
		expect(link).toBeLessThan(style)
		expect(source).toContain('Get your free personalized demo')
	})

	it('adds the footer demo link without contact channels', async () => {
		const source = await component('Footer')

		expect(source).toContain("label: 'Free Demo', href: '/book-demo'")
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

			// The booking URL lives once, in src/lib/offer.ts.
			if (file !== 'lib/offer.ts') {
				expect(source, file).not.toContain('https://cal.com')
			}
		}
	})
})
