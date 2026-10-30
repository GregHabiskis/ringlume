import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const footerSourceUrl = new URL('../Footer.astro', import.meta.url)

describe('footer', () => {
	it('links to Free Demo, Terms, Privacy, and Contact', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).toContain("label: 'Free Demo', href: '/book-demo'")
		expect(source).toContain("label: 'Terms', href: '/terms'")
		expect(source).toContain("label: 'Privacy', href: '/privacy'")
		expect(source).toContain("label: 'Contact', href: '/contact'")
		expect(source).not.toContain('/refund')
		expect(source).not.toContain('Navigation')
		expect(source).not.toMatch(/telegram|t\.me|fshahariar/i)
	})

	it('keeps the logo, slogan, and copyright', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).toContain('logo-320-trimmed.webp')
		expect(source).toContain(
			'Managed virtual receptionist and call handling for service businesses.',
		)
		expect(source).toContain('All rights reserved.')
	})

	it('drops the old third-party tech disclaimer', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).not.toContain('licensed third-party technology')
		expect(source).not.toContain('setup, deployment, billing, and support')
	})
})
