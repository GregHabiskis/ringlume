import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (file: string) =>
	readFile(new URL(`../${file}.astro`, import.meta.url), 'utf8')

describe('AI receptionist call flow', () => {
	it('shows answer, understand, and act in a numbered, ordered sequence', async () => {
		const source = await read('Capabilities')
		expect(
			[...source.matchAll(/step: (\d)/g)].map((match) => Number(match[1])),
		).toEqual([1, 2, 3])
		expect(
			[...source.matchAll(/kind: '(\w+)'/g)].map((match) => match[1]),
		).toEqual(['answer', 'capture', 'action'])
		expect(source).toContain('<ol')
		expect(source).toContain('aria-label="How Ringlume handles a call"')
		expect(source).toContain('Answers the call.')
		expect(source).toContain('Understands the request.')
		expect(source).toContain('Takes the next step.')
	})

	it('captures the request before choosing between booking, transfer and message', async () => {
		const [section, card] = await Promise.all([
			read('Capabilities'),
			read('CapabilityCard'),
		])
		expect(section).toContain(
			'Books an estimate, transfers the call, or takes a message, following your rules.',
		)
		for (const detail of [
			'Tree work',
			'Address captured',
			'Name & phone captured',
		])
			expect(card).toContain(detail)
		for (const nextStep of [
			'Book an estimate',
			'Transfer the call',
			'Take a message',
		])
			expect(card).toContain(nextStep)
		expect(card).toContain('aria-label="Possible next steps"')
		expect(card).not.toContain('Booked</span>')
		expect(card).not.toContain('Urgent tree work')
	})

	it('closes the loop with a team summary instead of unrelated feature tiles', async () => {
		const section = await read('Capabilities')
		expect(section).toContain('Your team gets the details.')
		expect(section).toContain('in a call summary.')
		expect(section).not.toContain('Your answers.')
		expect(section).not.toContain('Call records.')
		expect(section).not.toContain('to booked estimate.')
	})

	it('keeps the illustrative flow static, mobile-first and free of unsupported performance claims', async () => {
		const [section, card] = await Promise.all([
			read('Capabilities'),
			read('CapabilityCard'),
		])
		expect(section).not.toContain('Illustrative tree-care call flow')
		expect(section).toContain('Illustrative example')
		expect(section).toContain('content-auto')
		expect(section).toContain('class="call-journey"')
		expect(section).toContain('.call-journey::before')
		expect(card).toContain('class="flow-number" aria-hidden="true"')
		expect(card).toContain('@media (min-width: 1024px)')
		expect(card).not.toContain('flow-connector')
		expect(card).not.toContain('min-height: 280px')
		for (const source of [section, card]) {
			expect(source).not.toMatch(
				/<script|animation:|filter:|box-shadow|text-shadow|Answered in 1\.2s|instant booking|emergency dispatch/i,
			)
		}
	})

	it('uses distinct conversation, request-note and branching route visuals', async () => {
		const card = await read('CapabilityCard')
		for (const name of [
			'flow-bubble-receptionist',
			'flow-bubble-caller',
			'flow-note',
			'flow-details',
			'flow-options',
			'flow-option',
		]) {
			expect(card).toContain(name)
		}
		expect(card).toContain('“Example Tree Care. How can I help?”')
		expect(card).toContain('“I’d like an estimate for oak removal.”')
		expect(card).toContain('repeat(3, minmax(0, 1fr))')
		expect(card).toContain('.flow-option::before')
		expect(card).not.toContain('flow-preview')
	})

	it('keeps translucent previews legible for reduced transparency and high contrast', async () => {
		const [section, card] = await Promise.all([
			read('Capabilities'),
			read('CapabilityCard'),
		])
		expect(card).toContain('glass glass-fill glass-regular glass-card')
		expect(card).toContain('prefers-reduced-transparency: reduce')
		expect(card).toContain('background: var(--bg-alt)')
		expect(card).toContain('border-color: var(--fg-3)')
		expect(section).toContain('prefers-contrast: more')
	})
})
