import {
	formatList,
	PRODUCTION_MAX,
	SETUP_QUALIFIER,
	SUPPORTED_STACK,
} from '../lib/offer'

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
	href: '/contact' | '/#pricing'
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
			"Yes. Ringlume can answer calls 24/7, including while your team is helping customers, working on-site, in meetings, after hours, or already handling another call.",
			"The goal is to make sure new opportunities don't automatically turn into missed calls or voicemail simply because your team is unavailable.",
		],
	},
	{
		id: 'urgent-calls',
		question: 'Can Ringlume handle urgent calls?',
		paragraphs: [
			"Yes. Ringlume can be set up to recognize situations your business considers urgent, collect the caller's information, and follow the steps you choose.",
			'For example, certain call types, keywords, existing customers, or high-priority situations can be sent to the right person for immediate attention.',
		],
	},
	{
		id: 'professional-expertise',
		question: 'What happens when a caller needs professional expertise?',
		paragraphs: [
			'Ringlume should not replace professional judgment.',
			'It can collect the relevant information, understand what the caller needs, and then book an appointment, transfer the call, or escalate the conversation to the appropriate person on your team.',
		],
	},
	{
		id: 'appointments',
		question: 'Can Ringlume book appointments automatically?',
		paragraphs: [
			'Yes. Ringlume can connect to your booking process and schedule appointments according to the availability, services, and scheduling rules you provide.',
			'A caller can move from asking about your business to having a confirmed appointment during the same conversation.',
		],
	},
	{
		id: 'lead-information',
		question: 'What information can Ringlume collect from a new lead?',
		paragraphs: ['Ringlume can collect information based on the process you choose, such as:'],
		list: [
			'Caller name',
			'Phone number',
			'Email address',
			'Service or request type',
			'Location or service address',
			'New or existing customer',
			'Preferred appointment date or time',
			'Details about what they need',
			'Urgency or priority',
			'Any other qualifying information your team requires',
		],
	},
	{
		id: 'business-questions',
		question: 'Can Ringlume answer questions about our business and services?',
		paragraphs: [
			'Yes. Ringlume can use information you approve, such as your website, services, service areas, business hours, pricing rules, FAQs, policies, and business documents.',
			'This allows callers to get useful answers without your team manually responding to the same questions repeatedly.',
		],
	},
	{
		id: 'pricing-questions',
		question: 'What if customers ask about pricing?',
		paragraphs: [
			'You control how Ringlume responds.',
			'If your business has fixed pricing, approved pricing information can be provided where appropriate.',
			"If pricing depends on the customer's situation, Ringlume can explain the relevant factors, gather the information your team needs, and offer to schedule a consultation, estimate, or appointment.",
			'Ringlume should not invent prices simply to keep a conversation moving.',
		],
	},
	{
		id: 'different-services',
		question: 'Can Ringlume handle different services or types of inquiries?',
		paragraphs: [
			'Yes. Ringlume can be set up with the specific services, departments, locations, and request types your business handles.',
			'Ringlume can identify what the caller is looking for and follow the appropriate booking, qualification, routing, or handoff steps.',
		],
	},
	{
		id: 'unknown-answer',
		question: "What happens if Ringlume doesn't know the answer?",
		paragraphs: [
			"Ringlume can be instructed not to guess.",
			"Instead, it can collect the caller's information and transfer the call, hand it off, or create a follow-up for your team when human input is needed.",
		],
	},
	{
		id: 'live-transfer',
		question: 'Can important calls be transferred to a real person?',
		paragraphs: [
			'Yes. Ringlume can support live transfer to a team member when enabled for your setup or plan.',
			'You can define which calls Ringlume should handle and which calls should be handed off to a member of your team.',
		],
	},
	{
		id: 'call-follow-up',
		question: 'Will we know what happened after every call?',
		paragraphs: [
			'Depending on your Ringlume setup and plan, your team can receive call information such as summaries, written call records, recordings, potential-customer details, and customer-record updates.',
			'This gives your team visibility into conversations without requiring someone to personally answer every call.',
		],
	},
	{
		id: 'receptionist-staff',
		question: 'Does Ringlume replace my receptionist or office staff?',
		paragraphs: [
			"It doesn't have to.",
			'Some businesses may use Ringlume as their primary receptionist, while others use it for overflow calls, after-hours coverage, asking potential customers the right questions, appointment booking, or repetitive inquiries.',
			'The goal is to let your team spend more time on work that requires human attention while Ringlume handles routine phone tasks.',
		],
	},
	{
		id: 'setup-time',
		question: 'How long does setup take?',
		paragraphs: [
			`Setup time depends on the tools you use. Setup is smoothest and quickest, often an afternoon ${SETUP_QUALIFIER}, when you use ${formatList(SUPPORTED_STACK.phone)} for phone service, ${formatList(SUPPORTED_STACK.calendar)} for the calendar, ${formatList(SUPPORTED_STACK.booking)} for booking appointments, and a well-known CRM such as ${formatList(SUPPORTED_STACK.crm)}.`,
			`With these tools, our aim is to take the production agent live within ${PRODUCTION_MAX}. The ${PRODUCTION_MAX} start after we have talked with you and you have confirmed what the agent needs to do.`,
			`If you need to keep an existing PBX system or use a custom CRM, integration is more complex and takes longer. The ${PRODUCTION_MAX} does not apply.`,
			'These tools are recommendations, not requirements. Setup times are targets, not guarantees.',
		],
	},
	{
		id: 'pricing',
		question: 'How much does Ringlume cost?',
		linkedParagraphs: [
			{
				before: 'Ringlume offers plans for different call volumes and the tasks you want it to handle. See our ',
				linkText: 'pricing',
				href: '/#pricing',
				after: " for current plans and included features, or book a demo if you're unsure which setup is the right fit for your business.",
			},
		],
	},
	{
		id: 'upgrade-subscription',
		question: 'How do I upgrade my subscription plan?',
		linkedParagraphs: [
			{
				before: 'Contact us through our ',
				linkText: 'Contact page',
				href: '/contact',
				after: " or any of our listed contact channels. We'll upgrade your plan and charge the prorated difference for the remainder of your current billing period.",
			},
		],
		paragraphs: [
			"You'll receive a confirmation email once the upgrade is complete.",
		],
	},
	{
		id: 'cancel-subscription',
		question: 'How do I cancel my subscription plan?',
		linkedParagraphs: [
			{
				before: 'Send us a message through our ',
				linkText: 'Contact page',
				href: '/contact',
				after: ' or any of our listed contact channels and we will cancel the plan for you.',
			},
		],
		paragraphs: [
			'Cancellation takes effect at the end of your current billing period, so you keep access until then. You will receive a confirmation email once your subscription is cancelled.',
		],
	},
]
