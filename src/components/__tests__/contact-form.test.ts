import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const contactFormSourceUrl = new URL('../ContactForm.astro', import.meta.url)

const readSource = () => readFile(contactFormSourceUrl, 'utf8')

const fieldTag = (source: string, name: string) =>
	source.match(
		new RegExp(`<(?:input|select|textarea)[^>]*name="${name}"[^>]*>`),
	)?.[0] ?? ''

describe('contact form', () => {
	it('keeps the Netlify form wiring in static markup', async () => {
		const source = await readSource()

		expect(source).toContain('name="contact-message"')
		expect(source).toContain('method="POST"')
		expect(source).toContain('action="/contact/thanks"')
		expect(source).toContain('data-netlify="true"')
		expect(source).toContain('netlify-honeypot="bot-field"')
		expect(source).toContain(
			'<input type="hidden" name="form-name" value="contact-message" />',
		)
	})

	it('keeps the honeypot hidden and out of the tab order', async () => {
		const source = await readSource()
		const tag = fieldTag(source, 'bot-field')

		expect(source).toContain('<div class="hidden"')
		expect(tag).toContain('tabindex="-1"')
		expect(tag).toContain('autocomplete="off"')
	})

	it('keeps exactly two required fields', async () => {
		const source = await readSource()

		expect(source).toContain('name="email"')
		expect(source).toContain('name="message"')
		const names = [...source.matchAll(/<(?:input|textarea|select)\b[^>]*\bname="([^"]+)"/g)]
			.map((match) => match[1])
			.filter((name) => name !== 'form-name' && name !== 'bot-field')
		expect(names).toEqual(['email', 'message'])
		expect(source.match(/\brequired\b/g)).toHaveLength(2)

		expect(fieldTag(source, 'email')).toContain('required')
		expect(fieldTag(source, 'message')).toContain('required')
	})

	it('keeps the message textarea limits', async () => {
		const source = await readSource()
		const tag = fieldTag(source, 'message')

		expect(tag).toContain('rows="5"')
		expect(tag).toContain('maxlength="2000"')
		expect(source).toContain('resize-y')
	})

	it('keeps the submit button and privacy link', async () => {
		const source = await readSource()

		expect(source).toContain('Send message')
		expect(source).toContain('href="/privacy"')
	})
})
