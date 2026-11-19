import { defineMiddleware } from 'astro:middleware'
import { loadSite } from './lib/tina/site-data'

const pages = new Set([
	'/', '/pricing', '/faq', '/contact', '/contact/thanks', '/book-demo',
	'/book-demo/thanks', '/terms', '/privacy',
])
export const onRequest = defineMiddleware(async (context, next) => {
	const path = context.url.pathname.replace(/\/$/, '') || '/'
	if (pages.has(path) && (context.isPrerendered || import.meta.env.DEV)) {
		context.locals.site = (await loadSite()).data.site
	}
	return next()
})
