import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isCurrentNavigation, navigationSection } from '../../lib/header-navigation'

const headerUrl = new URL('../Header.astro', import.meta.url)

describe('homepage anchor navigation', () => {
	it('routes Features and its scroll-spy state to the single visual demonstration', async () => {
		const source = await readFile(headerUrl, 'utf8')
		const script = await readFile(new URL('../../scripts/header.ts', import.meta.url), 'utf8')
		expect(source).toContain('label: copy.nav.features, href: destinations.features')
		expect(script).toContain('navigationSection(href, new URL(window.location.href))')
		expect(source).not.toContain('/#capabilities')
	})

	it('links the demo item to the hero card and Pricing to its own page', async () => {
		const [header, demo, css] = await Promise.all([
			readFile(headerUrl, 'utf8'),
			readFile(new URL('../DemoSection.astro', import.meta.url), 'utf8'),
			readFile(new URL('../../styles/global.css', import.meta.url), 'utf8'),
		])
		expect(header).toContain('label: copy.nav.demo, href: destinations.liveDemo')
		expect(header).toContain('label: copy.nav.pricing, href: destinations.pricing')
		expect(header).not.toContain('#pricing')
		expect(demo).toContain('id="demo"')
		expect(demo).toContain('scroll-mt-24')
		expect(css).toContain('scroll-behavior: smooth')
	})

	it('prioritizes the hero demo only after it reaches its anchor clearance', async () => {
		const source = await readFile(new URL('../../scripts/header.ts', import.meta.url), 'utf8')
		expect(source).toContain('a.el.contains(b.el)')
		expect(source).toContain("el.id === 'demo'")
		expect(source).toContain('getComputedStyle(el).scrollMarginTop')
	})

	it('prepares layout and lets the browser perform one native scroll', async () => {
		const source = await readFile(new URL('../../scripts/header.ts', import.meta.url), 'utf8')

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
		const source = await readFile(new URL('../../scripts/header.ts', import.meta.url), 'utf8')

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

describe('editable navigation destinations', () => {
	const home = new URL('https://ringlume.com/')
	it('follows actual fragments and preserves only the existing route fallbacks', () => {
		for (const href of ['#visual', '/#visual', 'https://ringlume.com/#visual']) expect(navigationSection(href, home)).toBe('visual')
		expect(navigationSection('/#demo', home)).toBe('demo')
		expect(navigationSection('/', home)).toBe('hero')
		expect(navigationSection('/faq/', home)).toBe('faq')
		expect(navigationSection('/contact', home)).toBe('contact')
		for (const href of ['/pricing', '/other#demo', 'https://other.com/#demo', '//other.com/#demo', '/?other#demo', '/faq-extra']) {
			expect(navigationSection(href, home)).toBeNull()
		}
	})
	it('matches only local whole routes without query or fragment mismatches', () => {
		const current = new URL('https://ringlume.com/pricing/')
		expect(isCurrentNavigation('/pricing', current)).toBe(true)
		for (const href of ['/pricing#demo', '/pricing?other', '/price', 'https://other.com/pricing']) {
			expect(isCurrentNavigation(href, current)).toBe(false)
		}
	})
	it('binds shared destinations without losing label metadata or linking the footer logo', async () => {
		const header = await readFile(headerUrl, 'utf8')
		const footer = await readFile(new URL('../Footer.astro', import.meta.url), 'utf8')
		expect(header).toContain("tinaField(destinations, link.destination)")
		expect(header).toContain("tinaField(copy.nav, link.key)")
		expect(header).toContain('link === currentLink')
		expect(footer).toContain('tinaField(destinations, link.key)')
		expect(footer).toContain('tinaField(copy.footer, link.key)')
		expect(footer.slice(footer.indexOf('<picture>'), footer.indexOf('</picture>'))).not.toContain('<a')
	})
})
