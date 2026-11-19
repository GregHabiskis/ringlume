import { fillTokens, type SiteContent } from './site-model'
import { getOffer } from '../offer'

export function getPageMeta(site: SiteContent, page: string) {
	const marketing = site.pages[page as keyof typeof site.pages]
	const formKey = {
		contact: 'contactPage', bookDemo: 'bookDemoPage',
		contactThanks: 'contactThanks', bookDemoThanks: 'bookDemoThanks',
	} as const
	const form = site.forms[formKey[page as keyof typeof formKey]]
	const legal = site.legal[page as keyof typeof site.legal]
	const values = { demoFreeMinutes: site.offer.demoFreeMinutes, demoDeliveryMax: getOffer(site.offer).demoDeliveryMax }
	if (marketing) return { title: fillTokens(marketing.title, values), description: fillTokens(marketing.description, values) }
	const copy = form || legal
	if (!copy || !('metaTitle' in copy) || !('metaDescription' in copy)) throw new Error('Unknown page metadata')
	return { title: fillTokens(copy.metaTitle, values), description: fillTokens(copy.metaDescription, values) }
}
