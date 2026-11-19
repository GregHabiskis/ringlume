import type { SiteContent } from '../lib/tina/site-model'

export type FaqId =
	| 'busy-calls'
	| 'urgent-calls'
	| 'professional-expertise'
	| 'appointments'
	| 'lead-information'
	| 'business-questions'
	| 'pricing-questions'
	| 'different-services'
	| 'unknown-answer'
	| 'live-transfer'
	| 'call-follow-up'
	| 'receptionist-staff'
	| 'setup-time'
	| 'pricing'
	| 'upgrade-subscription'
	| 'cancel-subscription'

export interface FaqLinkedParagraph {
	before: string
	linkText: string
	href: '/contact' | '/pricing' | '/terms#setup-time'
	after: string
}

export interface FaqItem {
	id: FaqId
	question: string
	paragraphs?: string[]
	linkedParagraphs?: FaqLinkedParagraph[]
	list?: string[]
}

const ids: FaqId[] = [
	'busy-calls', 'urgent-calls', 'professional-expertise', 'appointments',
	'lead-information', 'business-questions', 'pricing-questions', 'different-services',
	'unknown-answer', 'live-transfer', 'call-follow-up', 'receptionist-staff',
	'setup-time', 'pricing', 'upgrade-subscription', 'cancel-subscription',
]
const links: Partial<Record<FaqId, FaqLinkedParagraph['href']>> = {
	'setup-time': '/terms#setup-time', pricing: '/pricing',
	'upgrade-subscription': '/contact', 'cancel-subscription': '/contact',
}

export function getFaqItems(copy: SiteContent['faq']): FaqItem[] {
	return ids.map((id) => {
		const key = id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof typeof copy
		const fields = copy[key] as Record<string, string>
		const href = links[id]
		const list = [fields.list1, fields.list2, fields.list3, fields.list4].filter((value): value is string => value !== undefined)
		return {
			id,
			question: fields.question,
			paragraphs: [fields.paragraph1, fields.paragraph2].filter((value): value is string => value !== undefined),
			list: list.length ? list : undefined,
			linkedParagraphs: href ? [{ href, before: fields.link1Before, linkText: fields.link1Text, after: fields.link1After }] : [],
		}
	})
}
