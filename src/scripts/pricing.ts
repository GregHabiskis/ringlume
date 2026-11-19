export function initPricing(root: HTMLElement) {
	if (root.dataset.pricingReady) return
	root.dataset.pricingReady = 'true'
const monthlyBtn = root.querySelector<HTMLElement>('#monthly-btn')
const annualBtn = root.querySelector<HTMLElement>('#annual-btn')

monthlyBtn?.addEventListener('click', () => setBillingPeriod(false))
annualBtn?.addEventListener('click', () => setBillingPeriod(true))

function setBillingPeriod(annual: boolean) {
	monthlyBtn?.classList.toggle('toggle-active', !annual)
	monthlyBtn?.classList.toggle('toggle-inactive', annual)
	monthlyBtn?.setAttribute('aria-pressed', String(!annual))
	annualBtn?.classList.toggle('toggle-active', annual)
	annualBtn?.classList.toggle('toggle-inactive', !annual)
	annualBtn?.setAttribute('aria-pressed', String(annual))

	root
		.querySelectorAll<HTMLElement>('.pricing-amount')
		.forEach((amount) => {
			amount.textContent = annual
				? (amount.dataset.annualMonthlyDisplay ?? '')
				: (amount.dataset.monthlyDisplay ?? '')
			const billing = amount
				.closest('[data-pricing-display]')
				?.querySelector('.pricing-billing')
			if (billing)
				billing.textContent = annual
					? (amount.dataset.annualBillingDisplay ?? '')
					: (amount.dataset.monthlyBillingDisplay ?? '')
		})
	root
		.querySelectorAll('.pricing-tilde')
		.forEach((tilde) => tilde.classList.toggle('hidden', !annual))
}
}
