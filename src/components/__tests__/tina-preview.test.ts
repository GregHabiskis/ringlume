import { describe, expect, it, vi } from 'vitest'
import { initPricing } from '../../scripts/pricing'
import { initFaq } from '../../scripts/faq'
import { readFile } from 'node:fs/promises'

describe('preview controls', () => {
	it('binds shared action destinations while retaining fixed-node runtime hooks', async () => {
		const bindings = {
			'tina/HeroCopy': ['freeDemo'],
			DemoSection: ['freeDemo'],
			ReceptionistVisual: ['liveDemo'],
			ReceptionistComparison: ['freeDemo'],
			Pricing: ['freeDemo', 'pricing', 'planComparison'],
			FAQ: ['faq'],
			CtaSection: ['freeDemo', 'contact'],
			'cms-regions/marketing/PricingBody': ['freeDemo'],
			'cms-regions/forms/ContactBody': ['whatsapp', 'email'],
			'cms-regions/forms/ContactThanksBody': ['home', 'freeDemo'],
			'cms-regions/forms/BookDemoThanksBody': ['home', 'liveDemo', 'setupMeeting'],
			'cms-regions/legal/TermsBody': ['setupMeeting'],
		}
		for (const [component, keys] of Object.entries(bindings)) {
			const source = await readFile(new URL(`../${component}.astro`, import.meta.url), 'utf8')
			for (const key of keys) expect(source, component).toContain(`site.links.${key}`)
			expect(source, component).not.toContain('data-tina-link')
		}
		for (const [component, key] of [['DemoSection', 'freeDemo'], ['ReceptionistVisual', 'liveDemo']]) {
			const source = await readFile(new URL(`../${component}.astro`, import.meta.url), 'utf8')
			expect(source).toContain(`data-site-link="${key}"`)
		}
		const runtime = await readFile(new URL('../tina/RuntimeCopy.astro', import.meta.url), 'utf8')
		expect(runtime).toContain("links: page === 'home' ? site.links : undefined")
	})

	it('initializes each pricing root once and scopes its controls', () => {
		const monthly = { addEventListener: vi.fn() }
		const annual = { addEventListener: vi.fn() }
		const root = {
			dataset: {},
			querySelector: vi.fn((selector: string) =>
				selector === '#monthly-btn' ? monthly : annual,
			),
		} as unknown as HTMLElement
		initPricing(root)
		initPricing(root)
		expect(monthly.addEventListener).toHaveBeenCalledTimes(1)
		expect(annual.addEventListener).toHaveBeenCalledTimes(1)
		expect(root.querySelector).toHaveBeenCalledTimes(2)
	})

	it('initializes each FAQ root once', () => {
		const trigger = { addEventListener: vi.fn() }
		const root = {
			dataset: {},
			querySelectorAll: vi.fn(() => [trigger]),
		} as unknown as HTMLElement
		initFaq(root)
		initFaq(root)
		expect(trigger.addEventListener).toHaveBeenCalledTimes(2)
		expect(root.querySelectorAll).toHaveBeenCalledTimes(1)
	})

	it('passes section metadata to editable headings while retaining the default copy', async () => {
		const renderer = await readFile(new URL('../cms-regions/marketing/HomeBody.astro', import.meta.url), 'utf8')
		for (const component of ['ReceptionistComparison', 'Pricing', 'FomoSection', 'FAQ', 'CtaSection']) {
			expect(renderer).toContain(`<${component} `)
			const source = await readFile(new URL(`../${component}.astro`, import.meta.url), 'utf8')
			expect(source).toContain(`tinaField(copy, 'heading')`)
			expect(source).toContain(`tinaField(copy, 'accent')`)
		}
		for (const component of ['Pricing', 'FomoSection']) {
			const source = await readFile(new URL(`../${component}.astro`, import.meta.url), 'utf8')
			expect(source).toContain(`tinaField(copy, 'description')`)
		}
	})
})
