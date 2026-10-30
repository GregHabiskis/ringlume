export function getAnchorTarget(hash: string): HTMLElement | null {
	if (!hash.startsWith('#') || hash.length < 2) return null
	try {
		return document.getElementById(decodeURIComponent(hash.slice(1)))
	} catch {
		return null
	}
}

export function prepareAnchorLayout(target: HTMLElement | null): void {
	if (!target) return

	const sections = document.querySelectorAll<HTMLElement>('main .content-auto')
	for (const section of sections) {
		if (
			section === target ||
			section.contains(target) ||
			(section.compareDocumentPosition(target) &
				Node.DOCUMENT_POSITION_FOLLOWING) !== 0
		) {
			// Keep visited sections laid out so they cannot collapse mid-scroll.
			// Sections after the destination retain their offscreen rendering savings.
			section.style.contentVisibility = 'visible'
		}
	}

	// Flush the expanded layout BEFORE the browser resolves the native anchor.
	// Native navigation keeps its history, focus, header offset and reduced motion.
	target.getBoundingClientRect()
}
