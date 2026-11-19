import { REFERRAL_OPTIONS, WEBSITE_PATTERN } from './demo-form';

export type FormName = 'contact-message' | 'demo-request';
export type Submission =
	| { form: 'contact-message'; fields: { email: string; message: string } }
	| {
			form: 'demo-request';
			fields: {
				first_name: string;
				last_name: string;
				email: string;
				company_website: string;
				phone: string;
				referral_source: string;
			};
	  };

export const MAX_FORM_BYTES = 32_768;
const limits = {
	'contact-message': { email: 254, message: 2000 },
	'demo-request': {
		first_name: 100,
		last_name: 100,
		email: 254,
		company_website: 2048,
		phone: 100,
		referral_source: 100,
	},
};
const thanks = {
	'contact-message': '/contact/thanks',
	'demo-request': '/book-demo/thanks',
};
const website = new RegExp(`^(?:${WEBSITE_PATTERN})$`);
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const reply = (status: number) =>
	new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

/** Delivery must resolve only after the provider accepts the submission. */
export async function handleForm(
	request: Request,
	form: FormName,
	deliver: (submission: Submission) => Promise<void>,
): Promise<Response> {
	if (request.method !== 'POST') return reply(405);
	if (request.headers.get('origin') !== new URL(request.url).origin)
		return reply(403);
	if (
		request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
		'application/x-www-form-urlencoded'
	)
		return reply(415);
	const length = request.headers.get('content-length');
	if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_FORM_BYTES))
		return reply(413);

	let body = '';
	const reader = request.body?.getReader();
	if (!reader) return reply(400);
	try {
		const decoder = new TextDecoder('utf-8', { fatal: true });
		let bytes = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_FORM_BYTES) {
				await reader.cancel();
				return reply(413);
			}
			body += decoder.decode(value, { stream: true });
		}
		body += decoder.decode();
	} catch {
		return reply(400);
	} finally {
		reader.releaseLock();
	}
	try {
		decodeURIComponent(body.replace(/\+/g, ' '));
	} catch {
		return reply(400);
	}
	const params = new URLSearchParams(body);
	const allowed: Record<string, number> = {
		'form-name': 30,
		'bot-field': 200,
		...limits[form],
	};
	for (const [key, value] of params) {
		if (
			!Object.hasOwn(allowed, key) ||
			params.getAll(key).length !== 1 ||
			value.length > allowed[key] ||
			/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
		)
			return reply(400);
	}
	if (params.get('form-name') !== form) return reply(400);
	const redirect = () =>
		new Response(null, {
			status: 303,
			headers: { Location: thanks[form], 'Cache-Control': 'no-store' },
		});
	if (params.get('bot-field')?.trim()) return redirect();
	const fields = Object.fromEntries(
		Object.keys(limits[form]).map((key) => [key, (params.get(key) ?? '').trim()]),
	);
	const required = form === 'contact-message'
		? ['email', 'message']
		: ['first_name', 'last_name', 'email', 'company_website'];
	if (required.some((key) => !fields[key]) || !email.test(fields.email))
		return reply(400);
	if (form === 'demo-request') {
		if (
			!website.test(fields.company_website) ||
			(fields.referral_source &&
				!REFERRAL_OPTIONS.some((option) => option === fields.referral_source))
		)
			return reply(400);
	}
	try {
		await deliver({ form, fields } as Submission);
	} catch {
		return reply(503);
	}
	return redirect();
}
