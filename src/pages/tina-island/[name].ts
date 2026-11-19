import { experimental_createIslandRoute } from '@tinacms/astro/experimental'
import SitePreviewBoundary from '../../components/tina/SitePreviewBoundary.astro'
import { createSiteIslands } from '../../lib/tina/islands'
import type { APIRoute } from 'astro'

export const prerender = false
const render = experimental_createIslandRoute(createSiteIslands(SitePreviewBoundary))
export const POST: APIRoute = context => {
	const origin = context.request.headers.get('origin')
	if (origin && origin !== context.url.origin) {
		return new Response('Forbidden', { status: 403 })
	}
	return render(context)
}
