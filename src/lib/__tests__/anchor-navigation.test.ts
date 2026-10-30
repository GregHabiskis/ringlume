import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnchorTarget, prepareAnchorLayout } from '../anchor-navigation'

const section = (position = 4, containsTarget = false) =>
	({
		style: { contentVisibility: '' },
		contains: vi.fn(() => containsTarget),
		compareDocumentPosition: vi.fn(() => position),
		getBoundingClientRect: vi.fn(() => ({ top: 2400 }) as DOMRect),
	}) as unknown as HTMLElement

beforeEach(() => {
	vi.stubGlobal('Node', { DOCUMENT_POSITION_FOLLOWING: 4 })
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('anchor target resolution', () => {
	it('resolves IDs without treating fragments as CSS selectors', () => {
		const target = section()
		const getElementById = vi.fn(() => target)
		vi.stubGlobal('document', { getElementById })

		expect(getAnchorTarget('#pricing')).toBe(target)
		expect(getAnchorTarget('#live%2Ddemo')).toBe(target)
		expect(getElementById).toHaveBeenCalledWith('pricing')
		expect(getElementById).toHaveBeenCalledWith('live-demo')
	})

	it('ignores empty, non-fragment, and malformed IDs', () => {
		const getElementById = vi.fn()
		vi.stubGlobal('document', { getElementById })

		for (const hash of ['', '#', 'pricing', '#%E0%A4%A']) {
			expect(getAnchorTarget(hash)).toBeNull()
		}
		expect(getElementById).not.toHaveBeenCalled()
	})

	it('leaves missing targets to native navigation', () => {
		vi.stubGlobal('document', { getElementById: vi.fn(() => null) })
		expect(getAnchorTarget('#missing')).toBeNull()
	})
})

describe('anchor layout preparation', () => {
	it('lays out intervening sections and the destination before measuring', () => {
		const features = section()
		const demo = section()
		const pricing = section()
		const faq = section(2)
		const querySelectorAll = vi.fn(() => [features, demo, pricing, faq])
		vi.stubGlobal('document', { querySelectorAll })
		vi.mocked(pricing.getBoundingClientRect).mockImplementation(() => {
			expect(features.style.contentVisibility).toBe('visible')
			expect(demo.style.contentVisibility).toBe('visible')
			expect(pricing.style.contentVisibility).toBe('visible')
			expect(faq.style.contentVisibility).toBe('')
			return { top: 2400 } as DOMRect
		})

		prepareAnchorLayout(pricing)

		expect(querySelectorAll).toHaveBeenCalledWith('main .content-auto')
		expect(pricing.getBoundingClientRect).toHaveBeenCalledOnce()
		// Materialized sections stay laid out, rather than collapsing mid-scroll.
		expect(features.style.contentVisibility).toBe('visible')
		expect(demo.style.contentVisibility).toBe('visible')
	})

	it('also materializes a deferred ancestor of a nested target', () => {
		const parent = section(4, true)
		const target = section()
		const later = section(2)
		vi.stubGlobal('document', {
			querySelectorAll: vi.fn(() => [parent, later]),
		})

		prepareAnchorLayout(target)

		expect(parent.contains).toHaveBeenCalledWith(target)
		expect(parent.style.contentVisibility).toBe('visible')
		expect(later.style.contentVisibility).toBe('')
		expect(target.getBoundingClientRect).toHaveBeenCalledOnce()
	})

	it('does not touch layout when no anchor exists', () => {
		const querySelectorAll = vi.fn()
		vi.stubGlobal('document', { querySelectorAll })

		prepareAnchorLayout(null)
		expect(querySelectorAll).not.toHaveBeenCalled()
	})
})
