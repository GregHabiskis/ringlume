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

export const faqItems: FaqItem[] = [
	{
		id: 'busy-calls',
		question: "Can Ringlume answer calls when we're busy or unavailable?",
		paragraphs: [
			'Yes. Ringlume answers 24/7, including when your team is busy, on-site, or off the clock.',
		],
	},
	{
		id: 'urgent-calls',
		question: 'Can Ringlume handle urgent calls?',
		paragraphs: [
			'It can flag urgent business requests and contact your team using your rules. It is not an emergency service.',
		],
	},
	{
		id: 'professional-expertise',
		question: 'What happens when a caller needs professional expertise?',
		paragraphs: [
			'Ringlume collects the details and books a visit or transfers the call. It does not replace professional judgment.',
		],
	},
	{
		id: 'appointments',
		question: 'Can Ringlume book appointments automatically?',
		paragraphs: [
			'Yes. It checks your connected calendar and books appointments using your availability and scheduling rules.',
		],
	},
	{
		id: 'lead-information',
		question: 'What information can Ringlume collect from a new lead?',
		paragraphs: ['You choose what to collect, such as:'],
		list: [
			'Name and contact details',
			'Service address',
			'Work needed',
			'Preferred time and urgency',
		],
	},
	{
		id: 'business-questions',
		question: 'Can Ringlume answer questions about our business and services?',
		paragraphs: [
			'Yes. It uses your approved services, hours, service areas, prices, and FAQs.',
		],
	},
	{
		id: 'pricing-questions',
		question: 'What if customers ask about pricing?',
		paragraphs: [
			'It shares approved prices or books an estimate. It should not guess.',
		],
	},
	{
		id: 'different-services',
		question: 'Can Ringlume handle different services or types of inquiries?',
		paragraphs: [
			'Yes. Set different questions, booking steps, and handoff rules for each service you offer.',
		],
	},
	{
		id: 'unknown-answer',
		question: "What happens if Ringlume doesn't know the answer?",
		paragraphs: [
			'It can take a message or hand the call to your team instead of guessing.',
		],
	},
	{
		id: 'live-transfer',
		question: 'Can important calls be transferred to a real person?',
		paragraphs: [
			'Yes. When enabled, it transfers calls to your team using the rules you choose.',
		],
	},
	{
		id: 'call-follow-up',
		question: 'Will we know what happened after every call?',
		paragraphs: [
			'Yes. Call summaries, recordings, and caller details are available on all plans through your dashboard.',
		],
	},
	{
		id: 'receptionist-staff',
		question: 'Does Ringlume replace my receptionist or office staff?',
		paragraphs: [
			'It handles routine phone calls, not in-person duties. Use it alongside your team or for overflow calls.',
		],
	},
	{
		id: 'setup-time',
		question: 'How long does setup take?',
		linkedParagraphs: [
			{
				before: 'Timing depends on your phone system and tools. See ',
				linkText: 'setup details',
				href: '/terms#setup-time',
				after: '.',
			},
		],
	},
	{
		id: 'pricing',
		question: 'How much does Ringlume cost?',
		linkedParagraphs: [
			{
				before: 'See our ',
				linkText: 'plans',
				href: '/pricing',
				after: ' for prices, minutes, and setup fees.',
			},
		],
	},
	{
		id: 'upgrade-subscription',
		question: 'How do I upgrade my subscription plan?',
		linkedParagraphs: [
			{
				before: 'Use our ',
				linkText: 'Contact page',
				href: '/contact',
				after: ' to request an upgrade. We’ll confirm the change by email.',
			},
		],
	},
	{
		id: 'cancel-subscription',
		question: 'How do I cancel my subscription plan?',
		linkedParagraphs: [
			{
				before: 'Request cancellation through our ',
				linkText: 'Contact page',
				href: '/contact',
				after: '.',
			},
		],
		paragraphs: [
			'Cancellation takes effect at the end of your current billing period. We’ll email confirmation.',
		],
	},
]
