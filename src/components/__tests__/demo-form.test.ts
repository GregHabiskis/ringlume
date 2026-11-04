import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { REFERRAL_OPTIONS, WEBSITE_PATTERN } from '../../lib/demo-form'

const demoFormSourceUrl = new URL('../DemoRequestForm.astro', import.meta.url)

const readSource = () => readFile(demoFormSourceUrl, 'utf8')

const fieldTag = (source: string, name: string) =>
	source.match(new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`))?.[0] ??
	''

describe('demo request form', () => {
	it('keeps the Netlify form wiring in static markup', async () => {
		const source = await readSource()

		expect(source).toContain('name="demo-request"')
		expect(source).toContain('method="POST"')
		expect(source).toContain('action="/book-demo/thanks"')
		expect(source).toContain('data-netlify="true"')
		expect(source).toContain('netlify-honeypot="bot-field"')
		expect(source).toContain(
			'<input type="hidden" name="form-name" value="demo-request" />',
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

	it('labels the company website clearly and keeps URL validation', async () => {
		const source = await readSource()

		expect(source).toContain('pattern={WEBSITE_PATTERN}')
		expect(source).toMatch(/Company website\s*<span/)
		expect(source).not.toContain('Facebook page')
		expect(source).toContain(
			'title="Enter your company website, like example.com"',
		)

		const pattern = new RegExp(`^(?:${WEBSITE_PATTERN})$`, 'v')

		for (const value of [
			'ringlume.com',
			'www.ringlume.com',
			'https://ringlume.com/path',
			'facebook.com/mybusiness',
		]) {
			expect(pattern.test(value)).toBe(true)
		}

		for (const value of ['ringlume', 'foo bar', 'http://']) {
			expect(pattern.test(value)).toBe(false)
		}
	})

	it('keeps the referral choices in the agreed order', () => {
		expect(REFERRAL_OPTIONS).toEqual([
			'Google search',
			'Facebook',
			'X/Twitter',
			'YouTube',
			'Referral from someone',
			'Virtual assistant (ChatGPT, Claude, etc.)',
			'Other',
		])
	})

	it('keeps the demo button and delivery line', async () => {
		const source = await readSource()

		expect(source).toContain('Get my free demo')
		expect(source).toContain('DEMO_DELIVERY_MAX')
		expect(source).toContain('Your demo link arrives by email within')
		expect(source).toContain('href="/terms"')
		expect(source).toContain('Terms of Service')
		expect(source).toContain('href="/privacy"')
		expect(source.indexOf('href="/terms"')).toBeGreaterThan(
			source.indexOf('</button>'),
		)
	})

	it('rounds supported mobile and desktop pickers without adding JavaScript', async () => {
		const source = await readSource()

		expect(source).toContain(
			'@supports (appearance: base-select) and selector(::picker(select))',
		)
		expect(source).not.toContain('(hover: hover)')
		expect(source).not.toContain('(pointer: fine)')
		expect(source).toContain('@media (forced-colors: none)')
		expect(source).toContain('#referral_source::picker(select)')
		expect(source).toContain('border-radius: 0.75rem')
		expect(source).not.toContain('<script')
		expect(source).not.toContain('client:')
	})
})
