import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../../', import.meta.url)

const read = (path: string) => readFile(new URL(path, srcDir), 'utf8')

describe('/book-demo', () => {
	it('keeps the page header, subline, and demo-first layout', async () => {
		const source = await read('pages/book-demo.astro')

		expect(source).toContain('Get Your Free Personalized Demo')
		expect(source).toContain("we'll email you a private link")
		expect(source).toContain('free for up to {DEMO_FREE_MINUTES} minutes')
		expect(source.match(/\{DEMO_FREE_MINUTES\}/g)).toHaveLength(3)
		expect(source).toContain('<DemoRequestForm />')
		expect(source).toContain('What happens next')
		expect(source).toContain('Send us your details.')
		expect(source).toContain('We build a voice agent around your business.')
		expect(source).toContain('Test it free for up to')
		expect(source).toContain(
			'lg:grid-cols-[minmax(0,1fr)_31.5rem]',
		)
		expect(source).toContain('items-start')
	})

	it('puts the form before the context block in the DOM', async () => {
		const source = await read('pages/book-demo.astro')

		expect(source.indexOf('<DemoRequestForm />')).toBeLessThan(
			source.indexOf('<aside'),
		)
	})

	it('makes no setup-time or production claim', async () => {
		const source = await read('pages/book-demo.astro')

		expect(source).not.toMatch(/afternoon/i)
		expect(source).not.toContain('12 hours')
		expect(source).not.toContain('PRODUCTION_MAX')
		expect(source).not.toMatch(/setup time/i)
	})
})

describe('/book-demo/thanks', () => {
	it('confirms the 1-hour email delivery and offers the next steps', async () => {
		const source = await read('pages/book-demo/thanks.astro')

		expect(source).toContain('noindex')
		expect(source).toContain('Request received.')
		expect(source).toContain('within {DEMO_DELIVERY_MAX}')
		expect(source.match(/\{DEMO_DELIVERY_MAX\}/g)).toHaveLength(1)
		expect(source).toContain('href="/#demo"')
		expect(source).toContain('Try the live demo while you wait')
		expect(source).toContain('href={CAL_BOOKING_URL}')
		expect(source).toContain('Prefer to talk? Book a call')
		expect(source).not.toContain("import Header")
		expect(source).not.toContain("import Footer")
	})
})

describe('/contact/thanks', () => {
	it('confirms the message and points at the demo', async () => {
		const source = await read('pages/contact/thanks.astro')

		expect(source).toContain('noindex')
		expect(source).toContain("Message received. We'll reply by email.")
		expect(source).toContain('href="/book-demo"')
		expect(source).toContain('Get your free demo')
		expect(source).not.toContain('cal.com')
		expect(source).not.toContain("import Header")
		expect(source).not.toContain("import Footer")
	})
})

describe('/contact', () => {
	it('keeps the header copy and the two-channel layout', async () => {
		const source = await read('pages/contact.astro')

		expect(source).toContain('<ContactForm />')
		expect(source).toContain('Contact Us')
		expect(source).toContain(
			"Have questions about our virtual receptionist service? We're here to help.",
		)
		expect(source).toContain('href="https://wa.me/8801951284128"')
		expect(source).toContain('href="mailto:support@ringlume.com"')
		expect(source).toContain(
			'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6',
		)
		expect(source).toContain(
			'lg:grid-cols-[minmax(0,1fr)_31.5rem]',
		)
		expect(source).toContain('items-start')
		expect(source).not.toMatch(/telegram|https?:\/\/t\.me|fshahariar/i)
	})

	it('shows exactly two channel cards and puts the form first', async () => {
		const source = await read('pages/contact.astro')

		expect(
			source.match(/glass glass-fill glass-regular grain rounded-2xl p-8/g),
		).toHaveLength(2)
		expect(source.indexOf('<ContactForm />')).toBeLessThan(
			source.indexOf('https://wa.me/'),
		)
	})
})
