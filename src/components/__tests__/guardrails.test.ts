import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../../', import.meta.url)
const publicDir = new URL('../../../public/', import.meta.url)

const sourceFiles = async () => {
	const entries = await readdir(srcDir, { recursive: true })
	return entries.filter(
		(entry) =>
			/\.(astro|ts|md)$/.test(entry) && !entry.includes('__tests__'),
	)
}

const readSource = async (file: string) =>
	readFile(new URL(file, srcDir), 'utf8')

describe('content guardrails', () => {
	it('has no Telegram contact channel anywhere in source or assets', async () => {
		const files = await sourceFiles()

		for (const file of files) {
			const source = await readSource(file)
			expect(source, file).not.toMatch(
				/telegram|fshahariar|https?:\/\/t\.me/i,
			)
		}

		const assets = await readdir(publicDir, { recursive: true })
		for (const asset of assets) {
			expect(asset).not.toMatch(/telegram/i)
		}
	})

	it('has no retired setup or delivery wording', async () => {
		const banned = [
			/24[–-]48/,
			/\b48 hours\b/i,
			/\b24 hours\b/i,
			/\bsame day\b/i,
			/\bnext day\b/i,
			/\bwithin 24\b/i,
			/\bwithin 48\b/i,
			/\b48 Hrs\b/i,
			/\bwithin a few hours\b/i,
		]
		const files = await sourceFiles()

		for (const file of files) {
			const source = await readSource(file)

			for (const pattern of banned) {
				expect(source, `${file} matches ${pattern}`).not.toMatch(pattern)
			}
		}
	})

	it('removes retired production deadlines and qualifiers from all first-party source', async () => {
		const files = await sourceFiles()

		for (const file of files) {
			const source = await readSource(file)
			expect(source, file).not.toMatch(
				/PRODUCTION_MAX|\b12[\s-]+hours?\b|afternoon|under best circumstances/i,
			)
		}
	})

	it('keeps the demo delivery time in the shared constants only', async () => {
		const files = await sourceFiles()

		for (const file of files) {
			if (file === 'lib/offer.ts') continue

			const source = await readSource(file)
			expect(source, file).not.toMatch(/\b1 hour\b/i)
		}
	})
})
