declare namespace App {
	interface Locals {
		site: import('./lib/tina/site-model').SiteContent
	}
}

// Native Worker modules used by the form endpoints.
declare module 'cloudflare:workers' {
	export const env: unknown
}

declare module 'cloudflare:email' {
	export class EmailMessage {
		constructor(from: string, to: string, raw: string | ReadableStream)
		readonly from: string
		readonly to: string
	}
}
