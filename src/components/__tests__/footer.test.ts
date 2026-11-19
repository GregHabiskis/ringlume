import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const footerSourceUrl = new URL('../Footer.astro', import.meta.url)

describe('footer', () => {
	it('links to Free Demo, Terms, Privacy, and Contact', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).toContain('label: copy.footer.freeDemo, href: destinations.freeDemo')
		expect(source).toContain('label: copy.footer.terms, href: destinations.terms')
		expect(source).toContain('label: copy.footer.privacy, href: destinations.privacy')
		expect(source).toContain('label: copy.footer.contact, href: destinations.contact')
		expect(source).not.toContain('/refund')
		expect(source).not.toContain('Navigation')
		expect(source).not.toMatch(/telegram|t\.me|fshahariar/i)
	})

	it('keeps the logo and copyright without a repeated marketing slogan', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).toContain('logo-320-trimmed.webp')
		expect(source).not.toContain(
			'Managed virtual receptionist and call handling for service businesses.',
		)
		expect(source).toContain('copy.footer.copyright')
	})

	it('drops the old third-party tech disclaimer', async () => {
		const source = await readFile(footerSourceUrl, 'utf8')

		expect(source).not.toContain('licensed third-party technology')
		expect(source).not.toContain('setup, deployment, billing, and support')
	})
})
