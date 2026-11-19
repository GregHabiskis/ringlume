import {
	CALC_FIELDS,
	MISSED_CALL_DEFAULTS,
	bookingsPrecision,
	buildAssumptionSummary,
	buildResultSummary,
	calculateMissedCallRevenue,
	clampFieldValue,
	formatBookings,
	formatCurrency,
	formatInputValue,
	formatPercent,
	formatRepeatVisits,
	parseNumericInput,
	percentOfRange,
	sanitizeNumericText,
	type CalcField,
	type MissedCallResult,
	type CalculatorCopy,
} from '../lib/missed-calls-calc'

export function initCalculator(calculator: HTMLElement) {
	if (calculator.dataset.calculatorReady) return
	calculator.dataset.calculatorReady = 'true'
	let copy: CalculatorCopy = JSON.parse(calculator.dataset.calcCopyJson!)
	const annualEl = calculator.querySelector<HTMLElement>('[data-calc-annual]')
	const monthlyEl =
		calculator.querySelector<HTMLElement>('[data-calc-monthly]')
	const bookingsEl =
		calculator.querySelector<HTMLElement>('[data-calc-bookings]')
	const helperEl =
		calculator.querySelector<HTMLElement>('[data-calc-helper]')
	const statusEl =
		calculator.querySelector<HTMLElement>('[data-calc-status]')

	if (!annualEl || !monthlyEl || !bookingsEl) return

	const annualOutput = annualEl
	const monthlyOutput = monthlyEl
	const bookingsOutput = bookingsEl

	const state: Record<CalcField, number> = { ...MISSED_CALL_DEFAULTS }

	const groups = new Map<
		CalcField,
		{
			text?: HTMLInputElement
			range?: HTMLInputElement
			wrap?: HTMLElement
			tooltip?: HTMLElement
		}
	>()

	for (const field of CALC_FIELDS) {
		const text = calculator.querySelector<HTMLInputElement>(
			`[data-calc-field="${field}"][data-calc-kind="text"]`,
		)
		const range = calculator.querySelector<HTMLInputElement>(
			`[data-calc-field="${field}"][data-calc-kind="range"]`,
		)
		const wrap = range?.closest<HTMLElement>('[data-calc-slider-wrap]')
		const tooltip = wrap?.querySelector<HTMLElement>('[data-calc-tooltip]')
		const initial = text && parseNumericInput(field, text.value)
		if (typeof initial === 'number' && Number.isFinite(initial)) {
			state[field] = clampFieldValue(field, initial)
		}

		groups.set(field, {
			text: text ?? undefined,
			range: range ?? undefined,
			wrap: wrap ?? undefined,
			tooltip: tooltip ?? undefined,
		})
	}

	const initialResult = calculateMissedCallRevenue(state)
	const tweens = new Map<HTMLElement, { value: number; frame: number }>()
	tweens.set(annualOutput, { value: initialResult.annual, frame: 0 })
	tweens.set(monthlyOutput, { value: initialResult.monthly, frame: 0 })
	tweens.set(bookingsOutput, {
		value: initialResult.bookingsPerWeek,
		frame: 0,
	})

	const hideTimers = new WeakMap<HTMLElement, number>()
	const reducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)',
	)
	let statusTimer: number | undefined

	for (const field of CALC_FIELDS) {
		const group = groups.get(field)
		if (!group) continue

		if (group.text) {
			const text = group.text

			text.parentElement?.addEventListener('click', (event) => {
				if (event.target !== text) text.focus()
			})

			text.addEventListener('focus', () => {
				requestAnimationFrame(() => text.select())
			})

			text.addEventListener('input', () => {
				const clean = sanitizeNumericText(field, text.value)
				if (text.value !== clean) text.value = clean

				const parsed = parseNumericInput(field, clean)
				if (!Number.isFinite(parsed)) return

				state[field] = parsed
				render()
			})

			text.addEventListener('blur', () => {
				const value = clampFieldValue(field, state[field])
				state[field] = value
				text.value = formatInputValue(field, value)
				render()
			})

			text.addEventListener('keydown', (event) => {
				if (event.key === 'Enter') {
					event.preventDefault()
					text.blur()
				}
			})
		}

		if (group.range) {
			const range = group.range
			const wrap = group.wrap

			range.addEventListener('input', () => {
				const value = Number(range.value)
				if (!Number.isFinite(value)) return

				state[field] = value
				render()
				if (wrap) showTooltip(wrap)
			})

			range.addEventListener('focus', () => {
				if (wrap) showTooltip(wrap)
			})

			range.addEventListener('blur', () => {
				if (wrap) hideTooltip(wrap)
			})

			range.addEventListener('pointerdown', () => {
				if (wrap) showTooltip(wrap)
			})

			range.addEventListener('pointerup', (event) => {
				if (wrap && event.pointerType === 'touch') {
					hideTooltip(wrap, 800)
				}
			})

			range.addEventListener('pointercancel', () => {
				if (wrap) hideTooltip(wrap, 800)
			})

			range.addEventListener('keydown', () => {
				if (wrap) showTooltip(wrap)
			})
		}
	}

	const accordionButton = calculator.querySelector<HTMLButtonElement>(
		'[data-calc-acc-toggle]',
	)
	const accordionPanel = calculator.querySelector<HTMLElement>(
		'[data-calc-acc-panel]',
	)

	if (accordionButton && accordionPanel) {
		accordionButton.addEventListener('click', () => {
			const open = accordionButton.getAttribute('aria-expanded') !== 'true'
			accordionButton.setAttribute('aria-expanded', String(open))
			accordionPanel.dataset.open = String(open)

			if (open) {
				accordionPanel.removeAttribute('inert')
			} else {
				accordionPanel.setAttribute('inert', '')
			}
		})
	}

	syncVisuals()
	window.addEventListener('ringlume:copy-change', onCopyChange)

	function onCopyChange(event: Event) {
		if (!calculator.isConnected) {
			window.removeEventListener('ringlume:copy-change', onCopyChange)
			return
		}
		const next = (event as CustomEvent<{ calculator?: CalculatorCopy }>).detail?.calculator
		if (!next) return
		copy = next
		calculator.dataset.calcCopyJson = JSON.stringify(copy)
		calculator.setAttribute('aria-label', copy.label)
		calculator.querySelectorAll<HTMLElement>('[data-calc-copy]').forEach(element => {
			element.textContent = copy[element.dataset.calcCopy as keyof CalculatorCopy]
		})
		render(false)
	}

	function render(updateInputs = true) {
		const next = calculateMissedCallRevenue(state)
		const digits = bookingsPrecision(next.bookingsPerWeek)

		animateNumber(annualOutput, next.annual, value => formatCurrency(value, copy))
		animateNumber(monthlyOutput, next.monthly, value => formatCurrency(value, copy))
		animateNumber(bookingsOutput, next.bookingsPerWeek, (value) =>
			formatBookings(value, digits),
		)

		if (helperEl) {
			helperEl.textContent = buildAssumptionSummary(
				state.bookRate,
				state.repeatVisits,
				copy,
			)
		}

		syncVisuals(updateInputs)
		scheduleStatus(next)
	}

	function syncVisuals(updateInputs = true) {
		for (const field of CALC_FIELDS) {
			const group = groups.get(field)
			if (!group) continue

			const value = clampFieldValue(field, state[field])

			if (group.range && updateInputs) group.range.value = String(value)
			if (group.text && updateInputs && document.activeElement !== group.text) {
				group.text.value = formatInputValue(field, value)
			}
			if (group.wrap) {
				group.wrap.style.setProperty(
					'--pct',
					String(percentOfRange(field, value)),
				)
			}
			if (group.tooltip) {
				group.tooltip.textContent = tooltipValue(field, value)
			}
		}
	}

	function tooltipValue(field: CalcField, value: number): string {
		if (field === 'bookRate') return formatPercent(value, copy)
		if (field === 'repeatVisits') return `${formatRepeatVisits(value)}${copy.times}`
		return String(Math.round(value))
	}

	function animateNumber(
		element: HTMLElement,
		target: number,
		format: (value: number) => string,
	) {
		const entry = tweens.get(element) ?? { value: target, frame: 0 }

		if (entry.frame) cancelAnimationFrame(entry.frame)

		if (
			reducedMotion.matches ||
			!Number.isFinite(target) ||
			Math.abs(target - entry.value) < 0.0001
		) {
			entry.value = target
			entry.frame = 0
			element.textContent = format(target)
			tweens.set(element, entry)
			return
		}

		const from = entry.value
		const startedAt = performance.now()

		const tick = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / 480)
			const eased = 1 - Math.pow(1 - progress, 3)
			const value = from + (target - from) * eased

			entry.value = value
			element.textContent = format(value)

			if (progress < 1) {
				entry.frame = requestAnimationFrame(tick)
			} else {
				entry.value = target
				entry.frame = 0
				element.textContent = format(target)
			}
		}

		entry.frame = requestAnimationFrame(tick)
		tweens.set(element, entry)
	}

	function showTooltip(wrap: HTMLElement) {
		const timer = hideTimers.get(wrap)
		if (timer) {
			window.clearTimeout(timer)
			hideTimers.delete(wrap)
		}
		wrap.classList.add('is-active')
	}

	function hideTooltip(wrap: HTMLElement, delay = 0) {
		const timer = hideTimers.get(wrap)
		if (timer) window.clearTimeout(timer)

		if (delay > 0) {
			const nextTimer = window.setTimeout(() => {
				wrap.classList.remove('is-active')
				hideTimers.delete(wrap)
			}, delay)
			hideTimers.set(wrap, nextTimer)
			return
		}

		wrap.classList.remove('is-active')
		hideTimers.delete(wrap)
	}

	function scheduleStatus(next: MissedCallResult) {
		if (!statusEl) return
		if (statusTimer) window.clearTimeout(statusTimer)

		statusTimer = window.setTimeout(() => {
			statusEl.textContent = buildResultSummary(next, copy)
		}, 900)
	}
}
