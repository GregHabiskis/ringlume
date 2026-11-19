import { beforeEach, describe, expect, it, vi } from 'vitest'
import seed from '../../../content/site/site.json'

const { query, metadata } = vi.hoisted(() => ({
	query: vi.fn(),
	metadata: vi.fn(async (source: Promise<unknown>) => source),
}))
vi.mock('../../../tina/__generated__/client', () => ({
	default: { apiUrl: 'http://localhost:4001/graphql', queries: { site: query } },
}))
vi.mock('@tinacms/astro', () => ({ requestWithMetadata: metadata }))
import { loadSite } from './site-data'

describe('singleton loader boundary', () => {
	beforeEach(() => { vi.unstubAllEnvs(); query.mockReset(); metadata.mockClear() })
	it('preserves overlay identity and metadata instead of cloning into defaults', async () => {
		const overlay = structuredClone(seed)
		overlay.pricing.plans.basic.name = 'Edited name'
		const result = { data: { site: overlay }, id: 'form-id', query: 'query', variables: {} }
		query.mockResolvedValue(result)
		expect(await loadSite()).toBe(result)
		expect(metadata).toHaveBeenCalledWith(expect.any(Promise), { priority: 'primary' })
	})
	it('rejects invalid content and query failures without fallback', async () => {
		query.mockResolvedValue({ data: { site: {} } })
		await expect(loadSite()).rejects.toThrow()
		query.mockRejectedValue(new Error('Cloud unavailable'))
		await expect(loadSite()).rejects.toThrow('Cloud unavailable')
	})
})
