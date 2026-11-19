import { describe, expect, it } from 'vitest'
import seed from '../../../content/site/site.json'
import { validateSite, fillTokens, linkUrlError } from './site-model'
import { templateTokens } from './template-tokens'

describe('singleton trust boundary', () => {
	it('provides shared inline URL validation feedback', () => {
		expect(linkUrlError(undefined, 'home')).toBeTypeOf('string')
		expect(linkUrlError('javascript:alert(1)', 'home')).toBeTypeOf('string')
		expect(linkUrlError('/safe', 'home')).toBeUndefined()
		expect(linkUrlError('mailto:owner@example.com', 'email')).toBeUndefined()
		expect(linkUrlError('mailto:owner@example.com', 'home')).toBeTypeOf('string')
	})
	it('accepts edited safe destinations for every shared link', () => {
		for (const key of Object.keys(seed.links) as (keyof typeof seed.links)[]) {
			for (const url of ['/new/path?view=plans#details', '#details', 'https://example.com/path?q=value#details']) {
				const site = structuredClone(seed)
				site.links[key] = url
				expect(() => validateSite(site), `${key}: ${url}`).not.toThrow()
			}
		}
		expect(() => validateSite(seed)).not.toThrow()
		const site = structuredClone(seed)
		site.links.email = 'mailto:owner@example.com'
		expect(() => validateSite(site)).not.toThrow()
	})
	it('rejects unsafe destinations consistently for every shared link', () => {
		const unsafe = [
			'', '#', '//example.com', '/\\example.com', '\\example.com',
			'javascript:alert(1)', 'data:text/html,test', 'http://example.com',
			'ftp://example.com', 'https://user:password@example.com',
			'https://user@example.com', ' https://example.com', '/two words',
			'/path\nnext', '/path\u0000', '/path\u007f',
			'mailto:owner@example.com?subject=hello',
			'mailto:owner@example.com%0d%0aBcc:other@example.com',
			'/path%0aheader', '/%5cexample.com',
		]
		for (const key of Object.keys(seed.links) as (keyof typeof seed.links)[]) {
			for (const url of [...unsafe, ...(key === 'email' ? [] : ['mailto:owner@example.com'])]) {
				const site = structuredClone(seed)
				site.links[key] = url
				expect(() => validateSite(site), `${key}: ${url}`).toThrow()
			}
		}
	})
	it('rejects missing copy rather than publishing fallback text', () => {
		const site = structuredClone(seed)
		site.pricing.plans.basic.name = ''
		expect(() => validateSite(site)).toThrow()
	})
	it('rejects nonfinite, negative, fractional count and inconsistent annual settings', () => {
		for (const value of [NaN, Infinity, -1, 1.5]) {
			const site = structuredClone(seed)
			site.offer.demoFreeMinutes = value
			expect(() => validateSite(site)).toThrow()
		}
		const site = structuredClone(seed)
		site.pricing.plans.basic.annualTotal = site.pricing.plans.basic.monthly * 13
		expect(() => validateSite(site)).toThrow()
	})
	it('rejects unknown tokens and keeps inserted text literal', () => {
		expect(() => fillTokens('{arbitrary}', {})).toThrow()
		expect(() => fillTokens('{toString}', {})).toThrow()
		expect(fillTokens('{name}', { name: '<script>' })).toBe('<script>')
	})
	it('requires linked commercial placeholders and supported price precision', () => {
		const site = structuredClone(seed)
		site.pricing.plans.basic.benefits.item1 = 'A fixed number of minutes'
		expect(() => validateSite(site)).toThrow(/placeholders/)
		site.pricing.plans.basic.benefits.item1 = '{minutes} minutes'
		site.pricing.plans.basic.monthly = 100.001
		expect(() => validateSite(site)).toThrow(/decimal places/)
	})
	it('rejects added tokens in plain text and missing required legal references', () => {
		const site = structuredClone(seed)
		site.pricing.plans.basic.name = '{arbitrary}'
		expect(() => validateSite(site)).toThrow(/placeholders/)
		site.pricing.plans.basic.name = 'A plan'
		site.legal.terms.billing.paragraph1Text1 = 'Stale fixed plan names'
		expect(() => validateSite(site)).toThrow(/placeholders/)
	})
	it('registers every seeded template token explicitly', () => {
		function visit(value: unknown, path = '') {
			if (typeof value === 'string') {
				const tokens = [...value.matchAll(/\{([^{}]+)\}/g)].map(match => match[1])
				if (tokens.length) expect(new Set(tokens), path).toEqual(new Set(templateTokens[path]))
			} else if (value && typeof value === 'object') {
				for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key)
			}
		}
		visit(seed)
	})
})
