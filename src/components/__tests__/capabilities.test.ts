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
		expect(section).toContain('Illustrative tree-care call flow')
		expect(section).toContain('content-auto')
		expect(section).toContain('md:grid-cols-3')
		expect(card).toContain('rotate(90deg)')
		expect(card).toContain('@media (min-width: 768px)')
		for (const source of [section, card]) {
			expect(source).not.toMatch(
				/<script|animation:|Answered in 1\.2s|instant booking|emergency dispatch/i,
			)
		}
	})
})
