import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import seed from '../../../content/site/site.json'
import { getFaqItems } from '../../data/faqs'

describe('FAQ content', () => {
	it('keeps fixed question order and protected link targets while using editable copy', () => {
		const copy = structuredClone(seed.faq)
		copy.busyCalls.question = 'Edited question'
		copy.pricing.link1Text = 'Edited link'
		const items = getFaqItems(copy)
		expect(items).toHaveLength(16)
		expect(items[0].id).toBe('busy-calls')
		expect(items[0].question).toBe('Edited question')
		expect(items.find(item => item.id === 'pricing')?.linkedParagraphs?.[0])
			.toMatchObject({ href: '/pricing', linkText: 'Edited link' })
		expect(items.find(item => item.id === 'setup-time')?.linkedParagraphs?.[0]?.href).toBe('/terms#setup-time')
	})

	it('keeps the five-item homepage FAQ and accessible accordion', async () => {
		const [body, faq, script] = await Promise.all([
			readFile(new URL('../cms-regions/marketing/HomeBody.astro', import.meta.url), 'utf8'),
			readFile(new URL('../FAQ.astro', import.meta.url), 'utf8'),
			readFile(new URL('../../scripts/faq.ts', import.meta.url), 'utf8'),
		])
		for (const id of ['busy-calls', 'appointments', 'live-transfer', 'setup-time', 'pricing']) expect(body).toContain(`'${id}'`)
		expect(faq).toContain('getFaqItems(site.faq)')
		expect(faq).toContain('aria-controls={answerId}')
		expect(faq).toContain("tinaField(fields, 'question')")
		expect(script).toContain("event.key === 'ArrowDown'")
	})
})
