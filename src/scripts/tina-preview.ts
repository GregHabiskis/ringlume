import { initPricing } from './pricing'
import { initCalculator } from './calculator'
import { initFaq } from './faq'
import { initHeader, destroyHeader } from './header'

type InputState = { value: string; checked: boolean }
const inputs = new Map<string, InputState>()
const expanded = new Map<string, boolean>()
let annual: boolean | undefined
let menuOpen: boolean | undefined
let lastPayload = ''
const inputKey = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) =>
	element.id || element.getAttribute('name') || `${element.dataset.calcField}:${element.dataset.calcKind}`
function elements<T extends Element>(root: Element, selector: string): T[] {
	return [...(root.matches(selector) ? [root as T] : []), ...root.querySelectorAll<T>(selector)]
}
function capture(root: Element) {
	for (const header of elements<HTMLElement>(root, '[data-header-root]')) {
		menuOpen = !header.querySelector('#mobile-menu')?.classList.contains('hidden')
		destroyHeader(header)
	}
	for (const input of elements<HTMLInputElement>(root, 'input, textarea, select')) {
		inputs.set(inputKey(input), { value: input.value, checked: input.checked })
	}
	for (const button of elements<HTMLElement>(root, '[data-faq-trigger]')) {
		expanded.set(button.getAttribute('aria-controls') || '', button.getAttribute('aria-expanded') === 'true')
	}
	for (const button of elements<HTMLElement>(root, '#annual-btn')) {
		annual = button.getAttribute('aria-pressed') === 'true'
	}
}
function initialize(root: Element) {
	for (const header of elements<HTMLElement>(root, '[data-header-root]')) {
		initHeader(header)
		const toggle = header.querySelector<HTMLElement>('#mobile-menu-toggle')
		if (menuOpen !== undefined && (toggle?.getAttribute('aria-expanded') === 'true') !== menuOpen) toggle?.click()
	}
	elements<HTMLElement>(root, '[data-pricing-section]').forEach(initPricing)
	elements<HTMLElement>(root, '[data-missed-calculator]').forEach(initCalculator)
	elements<HTMLElement>(root, '[data-faq]').forEach(initFaq)
	for (const input of elements<HTMLInputElement>(root, 'input, textarea, select')) {
		const state = inputs.get(inputKey(input))
		if (!state) continue
		input.value = state.value
		if ('checked' in input) input.checked = state.checked
		input.dispatchEvent(new Event('input', { bubbles: true }))
	}
	for (const button of elements<HTMLElement>(root, '[data-faq-trigger]')) {
		const state = expanded.get(button.getAttribute('aria-controls') || '')
		if (state !== undefined && state !== (button.getAttribute('aria-expanded') === 'true')) button.click()
	}
	if (annual !== undefined) {
		elements<HTMLElement>(root, annual ? '#annual-btn' : '#monthly-btn').forEach(button => button.click())
	}
	for (const element of elements<HTMLElement>(root, '.reveal, .reveal-text')) {
		element.classList.remove('reveal', 'reveal-text', 'is-visible')
		element.style.removeProperty('--reveal-delay')
	}
}
export function refreshRuntime() {
	const payload = document.querySelector('[data-ringlume-copy]')?.textContent || ''
	if (!payload || payload === lastPayload) return
	const detail = JSON.parse(payload)
	lastPayload = payload
	for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-site-link]')) {
		const href = detail.links?.[link.dataset.siteLink || '']
		if (typeof href === 'string') link.setAttribute('href', href)
	}
	if (detail.meta?.title) document.title = detail.meta.title
	if (detail.meta?.description) document.querySelector('meta[name="description"]')?.setAttribute('content', detail.meta.description)
	window.dispatchEvent(new CustomEvent('ringlume:copy-change', { detail }))
}
export function previewReplacements(records: MutationRecord[]) {
	// The bridge retains the wrapper and detaches its old children before this callback.
	return records.filter(record => record.target instanceof Element && record.target.matches('[data-tina-island]'))
}
if (window.parent !== window) {
	refreshRuntime()
	new MutationObserver(records => {
		const replacements = previewReplacements(records)
		const removed = replacements.flatMap(record => [...record.removedNodes])
			.filter((node): node is Element => node instanceof Element)
		const added = replacements.flatMap(record => [...record.addedNodes])
			.filter((node): node is Element => node instanceof Element)
		removed.forEach(capture)
		// Only replacements containing controls need initialization, not their text-node updates.
		added.forEach(initialize)
		if (replacements.some(record => (record.target as Element).getAttribute('data-tina-island')?.includes('region=home'))) {
			document.querySelectorAll<HTMLElement>('[data-header-root]').forEach(header => {
				destroyHeader(header)
				initHeader(header)
			})
		}
		refreshRuntime()
	}).observe(document.body, { childList: true, subtree: true })
}
