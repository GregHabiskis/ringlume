import type { TinaField } from 'tinacms'
import seed from '../../../content/site/site.json'
import { templateTokens } from './template-tokens'
import { linkUrlError } from './site-model'

const linkDescriptions: Record<string, string> = {
	home: 'Home page, including shared logo links.',
	liveDemo: 'Try it now links to the live demo.',
	features: 'Features navigation destination.',
	pricing: 'Pricing navigation and homepage pricing CTA.',
	faq: 'FAQ navigation and homepage FAQ CTA.',
	contact: 'Contact page and contact CTAs.',
	freeDemo: 'Free Demo and Get Your Free Demo CTAs across all plans.',
	terms: 'Terms link in the footer.',
	privacy: 'Privacy Policy link in the footer.',
	planComparison: 'Compare plans anchor on the pricing page.',
	whatsapp: 'WhatsApp contact link.',
	email: 'Contact email link. A bare mailto:address@example.com is also allowed, without headers.',
	setupMeeting: 'Setup meeting booking links.',
}

export function siteFields(value: Record<string, unknown> = seed, path = ''): TinaField[] {
	return Object.entries(value).map(([name, child]): TinaField => {
		const label = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase())
		if (path === 'links') return {
			type: 'string', name, label, required: true,
			description: `${linkDescriptions[name]} Use a root-relative path, nonempty #fragment, or absolute HTTPS URL. No spaces or credentials.`,
			ui: { component: 'text', validate: value => linkUrlError(value, name) },
		}
		if (typeof child === 'string') return {
			type: 'string', name, label,
			description: templateTokens[path ? `${path}.${name}` : name]?.map(token => `{${token}}`).join(', '),
			ui: { component: child.length > 100 || child.includes('\n') ? 'textarea' : 'text' },
		}
		if (typeof child === 'number') return { type: 'number', name, label, required: true }
		if (typeof child === 'boolean') return {
			type: 'boolean', name, label, ...(name === 'recommended' ? { ui: { component: () => null } } : {}),
		}
		return { type: 'object', name, label: name === 'links' && !path ? 'Link URLs' : label, required: true, fields: siteFields(child as Record<string, unknown>, path ? `${path}.${name}` : name) }
	})
}
