const pathname = (path: string) => path.replace(/\/+$/, '') || '/'

function localNavigation(href: string, current: URL) {
	if (!/^(?:#|\/(?!\/)|https:\/\/)/.test(href)) return null
	try {
		const url = new URL(href, current)
		return url.origin === current.origin ? url : null
	} catch {
		return null
	}
}

export function isCurrentNavigation(href: string, current: URL) {
	const url = localNavigation(href, current)
	return !!url && !url.hash && url.search === current.search &&
		pathname(url.pathname) === pathname(current.pathname)
}

export function navigationSection(href: string, current: URL) {
	const url = localNavigation(href, current)
	if (!url || url.search !== current.search) return null
	if (pathname(url.pathname) === pathname(current.pathname)) {
		if (url.hash) {
			try { return decodeURIComponent(url.hash.slice(1)) } catch { return null }
		}
		return pathname(url.pathname) === '/' ? 'hero' : null
	}
	if (pathname(current.pathname) === '/' && !url.hash) {
		if (pathname(url.pathname) === '/faq') return 'faq'
		if (pathname(url.pathname) === '/contact') return 'contact'
	}
	return null
}
