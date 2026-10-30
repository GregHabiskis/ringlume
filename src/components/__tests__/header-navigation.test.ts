import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const headerUrl = new URL('../Header.astro', import.meta.url)

describe('homepage anchor navigation', () => {
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
