import { afterEach, expect, it, vi } from 'vitest'

vi.mock('./pricing', () => ({ initPricing: vi.fn() }))
vi.mock('./calculator', () => ({ initCalculator: vi.fn() }))
vi.mock('./faq', () => ({ initFaq: vi.fn() }))
vi.mock('./header', () => ({ initHeader: vi.fn(), destroyHeader: vi.fn() }))
afterEach(() => vi.unstubAllGlobals())

it('identifies retained-wrapper swaps even when removed children are detached', async () => {
	class FakeElement {
		constructor(private island = false) {}
		matches() { return this.island }
		closest() { return null }
	}
	vi.stubGlobal('Element', FakeElement)
	const window = {}
	vi.stubGlobal('window', Object.assign(window, { parent: window }))
	const { previewReplacements } = await import('./tina-preview')
	const detached = new FakeElement()
	const wrapper = new FakeElement(true)
	const replacement = { target: wrapper, removedNodes: [detached], addedNodes: [new FakeElement()] } as unknown as MutationRecord
	const nestedUpdate = { target: new FakeElement(), removedNodes: [], addedNodes: [] } as unknown as MutationRecord
	expect(detached.closest()).toBeNull()
	expect(previewReplacements([replacement, nestedUpdate])).toEqual([replacement])
	expect(previewReplacements([replacement])[0].removedNodes[0]).toBe(detached)
})

it('updates fixed-node destinations in place from the validated runtime payload', async () => {
	const links = [
		{ dataset: { siteLink: 'liveDemo' }, setAttribute: vi.fn() },
		{ dataset: { siteLink: 'freeDemo' }, setAttribute: vi.fn() },
	]
	const window = { dispatchEvent: vi.fn() }
	vi.stubGlobal('window', Object.assign(window, { parent: window }))
	vi.stubGlobal('CustomEvent', class {
		constructor(public type: string, public options: unknown) {}
	})
	vi.stubGlobal('document', {
		querySelector: () => ({
			textContent: JSON.stringify({ links: { liveDemo: '/new-demo', freeDemo: '/new-request' } }),
		}),
		querySelectorAll: () => links,
	})
	const { refreshRuntime } = await import('./tina-preview')
	refreshRuntime()
	expect(links[0].setAttribute).toHaveBeenCalledWith('href', '/new-demo')
	expect(links[1].setAttribute).toHaveBeenCalledWith('href', '/new-request')
	expect(window.dispatchEvent).toHaveBeenCalledTimes(1)
})
