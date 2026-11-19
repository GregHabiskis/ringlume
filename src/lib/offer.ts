import seed from '../../content/site/site.json'
import { fillTokens, type SiteContent } from './tina/site-model'

export function getOffer(offer: SiteContent['offer']) {
	return {
		demoFreeMinutes: offer.demoFreeMinutes,
		demoDeliveryHours: offer.demoDeliveryHours,
		listConjunction: offer.listConjunction,
		listSeparator: offer.listSeparator,
		demoDeliveryMax: fillTokens(offer.deliveryTemplate, {
			hours: offer.demoDeliveryHours,
			hourUnit: offer.demoDeliveryHours === 1 ? offer.hourSingular : offer.hourPlural,
		}),
		supportedStack: {
			phone: Object.keys(seed.offer.supportedStack.phone).map(key => (offer.supportedStack.phone as Record<string, string>)[key]),
			calendar: Object.keys(seed.offer.supportedStack.calendar).map(key => (offer.supportedStack.calendar as Record<string, string>)[key]),
			booking: Object.keys(seed.offer.supportedStack.booking).map(key => (offer.supportedStack.booking as Record<string, string>)[key]),
			crm: Object.keys(seed.offer.supportedStack.crm).map(key => (offer.supportedStack.crm as Record<string, string>)[key]),
		},
	}
}

// Compatibility defaults for pure tests. Public renderers use request-specific selectors.
export const DEMO_DELIVERY_MAX = getOffer(seed.offer).demoDeliveryMax
export const DEMO_FREE_MINUTES = seed.offer.demoFreeMinutes
export const SUPPORTED_STACK = getOffer(seed.offer).supportedStack

export function formatList(
	items: readonly string[],
	conjunction = seed.offer.listConjunction,
	separator = seed.offer.listSeparator,
): string {
	if (items.length <= 1) return items.join('')
	if (items.length === 2) return items.join(` ${conjunction} `)
	return `${items.slice(0, -1).join(separator)}${separator}${conjunction} ${items.at(-1) ?? ''}`
}
