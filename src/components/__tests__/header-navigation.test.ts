import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const headerUrl = new URL('../Header.astro', import.meta.url)

describe('homepage anchor navigation', () => {
	it('links the demo item to the hero card and Pricing to its own page', async () => {
		const [header, demo, css] = await Promise.all([
			readFile(headerUrl, 'utf8'),
			readFile(new URL('../DemoSection.astro', import.meta.url), 'utf8'),
			readFile(new URL('../../styles/global.css', import.meta.url), 'utf8'),
		])
		expect(header).toContain("{ label: 'Try it now', href: '/#demo' }")
		expect(header).toContain("{ label: 'Pricing', href: '/pricing' }")
		expect(header).not.toContain('#pricing')
		expect(demo).toContain('id="demo"')
		expect(demo).toContain('scroll-mt-24')
		expect(css).toContain('scroll-behavior: smooth')
	})

	it('prioritizes the hero demo only after it reaches its anchor clearance', async () => {
		const source = await readFile(headerUrl, 'utf8')
		expect(source.indexOf("['#demo', '/#demo']")).toBeLessThan(
			source.indexOf("['main > section:first-child', '/']"),
		)
		expect(source).toContain("el.id === 'demo'")
		expect(source).toContain('getComputedStyle(el).scrollMarginTop')
	})

	it('prepares layout and lets the browser perform one native scroll', async () => {
		const source = await readFile(headerUrl, 'utf8')

		expect(source).toContain('prepareAnchorLayout(target)')
		expect(source).toContain(
			'prepareAnchorLayout(getAnchorTarget(window.location.hash))',
		)
		expect(source).not.toMatch(/\b(?:scrollTo|scrollIntoView)\s*\(/)
		expect(source).not.toMatch(/\bpreventDefault\s*\(/)
		expect(source).not.toContain('settleAnchor')
		expect(source).not.toContain('pendingDeadline')
		expect(source).not.toContain('armAnchor')
	})

	it('leaves modified clicks, downloads and cross-page links alone', async () => {
		const source = await readFile(headerUrl, 'utf8')

		for (const guard of [
			'event.defaultPrevented',
			'event.button !== 0',
			'event.metaKey',
			'event.ctrlKey',
			'event.shiftKey',
			'event.altKey',
			"link.hasAttribute('download')",
			"link.target !== '_self'",
			'url.origin !== window.location.origin',
			'url.pathname !== window.location.pathname',
			'url.search !== window.location.search',
		]) {
			expect(source).toContain(guard)
		}
	})
})
