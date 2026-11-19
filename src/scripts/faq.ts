export function initFaq(faqSection: HTMLElement) {
	if (faqSection.dataset.faqReady) return
	faqSection.dataset.faqReady = 'true'
const faqTriggers = Array.from(
	faqSection?.querySelectorAll<HTMLButtonElement>('[data-faq-trigger]') ?? [],
)

function setExpanded(trigger: HTMLButtonElement, expanded: boolean) {
	const answerId = trigger.getAttribute('aria-controls')
	const answer = answerId ? faqSection.querySelector<HTMLElement>(`#${CSS.escape(answerId)}`) : null

	if (!answer) return

	trigger.setAttribute('aria-expanded', String(expanded))

	if (expanded) {
		answer.hidden = false
		requestAnimationFrame(() => {
			if (trigger.getAttribute('aria-expanded') === 'true') {
				answer.dataset.open = 'true'
			}
		})
		return
	}

	answer.dataset.open = 'false'

	if (
		answer.hidden ||
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		answer.hidden = true
		return
	}

	answer.addEventListener(
		'transitionend',
		(event) => {
			if (
				event.propertyName === 'grid-template-rows' &&
				trigger.getAttribute('aria-expanded') === 'false'
			) {
				answer.hidden = true
			}
		},
		{ once: true },
	)
}

faqTriggers.forEach((trigger, index) => {
	trigger.addEventListener('click', () => {
		const isExpanded = trigger.getAttribute('aria-expanded') === 'true'
		setExpanded(trigger, !isExpanded)
	})

	trigger.addEventListener('keydown', (event) => {
		let nextIndex: number | undefined

		if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
			nextIndex = (index + 1) % faqTriggers.length
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
			nextIndex = (index - 1 + faqTriggers.length) % faqTriggers.length
		} else if (event.key === 'Home') {
			nextIndex = 0
		} else if (event.key === 'End') {
			nextIndex = faqTriggers.length - 1
		}

		if (nextIndex === undefined) return

		event.preventDefault()
		faqTriggers[nextIndex]?.focus()
	})
})
}
