import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { faqItems } from '../../data/faqs'

const faqSourceUrl = new URL('../FAQ.astro', import.meta.url)
const dataSourceUrl = new URL('../../data/faqs.ts', import.meta.url)
const homepageSourceUrl = new URL('../../pages/index.astro', import.meta.url)
const faqPageSourceUrl = new URL('../../pages/faq.astro', import.meta.url)
const footerSourceUrl = new URL('../Footer.astro', import.meta.url)
const headerSourceUrl = new URL('../Header.astro', import.meta.url)

const expectedQuestions = [
	"Can Ringlume answer calls when we're busy or unavailable?",
	'Can Ringlume handle urgent calls?',
	'What happens when a caller needs professional expertise?',
	'Can Ringlume book appointments automatically?',
	'What information can Ringlume collect from a new lead?',
	'Can Ringlume answer questions about our business and services?',
	'What if customers ask about pricing?',
	'Can Ringlume handle different services or types of inquiries?',
	"What happens if Ringlume doesn't know the answer?",
	'Can important calls be transferred to a real person?',
	'Will we know what happened after every call?',
	'Does Ringlume replace my receptionist or office staff?',
	'How long does setup take?',
	'How much does Ringlume cost?',
	'How do I upgrade my subscription plan?',
	'How do I cancel my subscription plan?',
]

describe('FAQ content', () => {
	it('keeps all 16 FAQs in the requested order', () => {
		expect(faqItems).toHaveLength(16)
		expect(faqItems.map((faq) => faq.question)).toEqual(expectedQuestions)
	})

	it('includes the subscription upgrade and cancellation guidance', async () => {
		const source = await readFile(dataSourceUrl, 'utf8')

		expect(source).toContain('How do I upgrade my subscription plan?')
		expect(source).toContain("href: '/contact'")
		expect(source).toContain('within a few hours')
		expect(source).toContain('How do I cancel my subscription plan?')
		expect(source).toContain("href: '/portal'")
		expect(source).toContain('Manage or Cancel Subscription.')
	})

	it('links pricing FAQ visitors to the pricing section', async () => {
		const source = await readFile(dataSourceUrl, 'utf8')

		expect(source).toContain('See our ')
		expect(source).toContain("href: '/#pricing'")
		expect(source).toContain('book a demo')
		expect(source).not.toContain('See the pricing above')
	})

	it('keeps only the main FAQ heading above the accordion', async () => {
		const source = await readFile(faqSourceUrl, 'utf8')

		expect(source).not.toContain('Everything you need to know about Ringlume')
		expect(source).not.toContain(
			'Common questions about how Ringlume answers calls, qualifies leads, books appointments, handles urgent requests, and works alongside your team.',
		)
		expect(source).toContain('Frequently Asked')
	})

	it('preserves the accessible accordion wiring', async () => {
		const source = await readFile(faqSourceUrl, 'utf8')

		expect(source).toContain('data-faq-trigger')
		expect(source).toContain('aria-controls={answerId}')
		expect(source).toContain("event.key === 'ArrowDown'")
	})

	it('keeps the homepage to the specified five FAQs', async () => {
		const source = await readFile(homepageSourceUrl, 'utf8')
		const homepageQuestions = expectedQuestions.filter(
			(question) =>
				question !== "Can Ringlume answer calls when we're busy or unavailable?" &&
				question !== 'Can Ringlume book appointments automatically?' &&
				question !== 'Can important calls be transferred to a real person?' &&
				question !== 'How long does setup take?' &&
				question !== 'How much does Ringlume cost?',
		)

		expect(source).toContain("'busy-calls'")
		expect(source).toContain("'appointments'")
		expect(source).toContain("'live-transfer'")
		expect(source).toContain("'setup-time'")
		expect(source).toContain("'pricing'")
		expect(source).toContain('<FAQ faqIds={homepageFaqIds} showAllLink />')
		homepageQuestions.forEach((question) => expect(source).not.toContain(question))
	})

	it('links the homepage preview and footer to the full FAQ page', async () => {
		const [faqPageSource, footerSource, faqComponentSource, headerSource] = await Promise.all([
			readFile(faqPageSourceUrl, 'utf8'),
			readFile(footerSourceUrl, 'utf8'),
			readFile(faqSourceUrl, 'utf8'),
			readFile(headerSourceUrl, 'utf8'),
		])

		expect(faqPageSource).toContain('title="Frequently Asked Questions | Ringlume"')
		expect(faqPageSource).toContain('<FAQ headingLevel="h1" />')
		expect(footerSource).toContain('href="/faq"')
		expect(footerSource).toContain('>FAQ</a>')
		expect(faqComponentSource).toContain('href="/faq"')
		expect(faqComponentSource).toContain('View all FAQs')
		expect(headerSource).toContain("{ label: 'FAQ', href: '/faq' }")
		expect(headerSource).toContain('{navLinks.map((link) => (')
	})
})
