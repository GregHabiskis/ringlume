import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { REFERRAL_OPTIONS, WEBSITE_PATTERN } from '../../lib/contact-form'

const contactFormSourceUrl = new URL('../ContactForm.astro', import.meta.url)

const readSource = () => readFile(contactFormSourceUrl, 'utf8')

const fieldTag = (source: string, name: string) =>
	source.match(new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`))?.[0] ??
	''

describe('contact form', () => {
	it('keeps the Netlify form wiring in static markup', async () => {
		const source = await readSource()

		expect(source).toContain('name="contact"')
		expect(source).toContain('method="POST"')
		expect(source).toContain('action="/contact/thanks"')
		expect(source).toContain('data-netlify="true"')
		expect(source).toContain('netlify-honeypot="bot-field"')
		expect(source).toContain(
			'<input type="hidden" name="form-name" value="contact" />',
		)
	})

	it('keeps the honeypot hidden and out of the tab order', async () => {
		const source = await readSource()
		const tag = fieldTag(source, 'bot-field')

		expect(source).toContain('<div class="hidden"')
		expect(tag).toContain('tabindex="-1"')
		expect(tag).toContain('autocomplete="off"')
	})

	it('keeps the final field names and required set', async () => {
		const source = await readSource()
		const requiredFields = [
			'first_name',
			'last_name',
			'email',
			'company_website',
		]
		const optionalFields = ['phone', 'referral_source']

		for (const name of [...requiredFields, ...optionalFields]) {
			expect(source).toContain(`name="${name}"`)
		}

		for (const name of requiredFields) {
			expect(fieldTag(source, name)).toContain('required')
		}

		for (const name of optionalFields) {
			expect(fieldTag(source, name)).not.toContain('required')
		}

		expect(source.match(/\brequired\b/g)).toHaveLength(4)
	})

	it('keeps the bare-domain website pattern', async () => {
		const source = await readSource()

		expect(source).toContain('pattern={WEBSITE_PATTERN}')
		expect(source).toContain('title="Enter your website, like example.com"')

		const pattern = new RegExp(`^(?:${WEBSITE_PATTERN})$`, 'v')

		for (const value of [
			'ringlume.com',
			'www.ringlume.com',
			'https://ringlume.com/path',
		]) {
			expect(pattern.test(value)).toBe(true)
		}

		for (const value of ['ringlume', 'foo bar', 'http://']) {
			expect(pattern.test(value)).toBe(false)
		}
	})

	it('keeps the referral choices in the agreed order', async () => {
		expect(REFERRAL_OPTIONS).toEqual([
			'Google search',
			'Social media',
			'Facebook group',
			'Referral from someone',
			'AI assistant (ChatGPT, Claude, etc.)',
			'Other',
		])
	})
})
