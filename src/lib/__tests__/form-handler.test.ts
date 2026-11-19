import { describe, expect, it, vi } from 'vitest';
import { handleForm, MAX_FORM_BYTES, type FormName } from '../form-handler';

const payloads = {
	'contact-message': { email: 'person@example.com', message: 'Please call me.' },
	'demo-request': {
		first_name: 'Jane',
		last_name: 'Smith',
		email: 'person@example.com',
		company_website: 'example.com',
		phone: '',
		referral_source: 'Google search',
	},
};
function request(form: FormName, extra: Record<string, string> = {}, headers = {}) {
	return new Request('https://ringlume.com/api/form', {
		method: 'POST',
		headers: {
			origin: 'https://ringlume.com',
			'content-type': 'application/x-www-form-urlencoded',
			...headers,
		},
		body: new URLSearchParams({ 'form-name': form, ...payloads[form], ...extra }),
	});
}

describe.each(['contact-message', 'demo-request'] as const)('%s handler', (form) => {
	it('delivers only validated known fields before redirecting', async () => {
		let accept!: () => void;
		const deliver = vi.fn(() => new Promise<void>((resolve) => { accept = resolve; }));
		const pending = handleForm(request(form), form, deliver);
		await vi.waitFor(() => expect(deliver).toHaveBeenCalledOnce());
		expect(deliver).toHaveBeenCalledWith({ form, fields: payloads[form] });
		accept();
		const response = await pending;
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe(
			form === 'contact-message' ? '/contact/thanks' : '/book-demo/thanks',
		);
	});

	it.each<Record<string, string>>([
		{ email: '' },
		{ email: 'bad' },
		{ email: 'a'.repeat(255) },
		{ unexpected: 'field' },
		{ 'form-name': 'wrong' },
	])('rejects invalid fields %j', async (extra) => {
		const deliver = vi.fn();
		expect((await handleForm(request(form, extra), form, deliver)).status).toBe(400);
		expect(deliver).not.toHaveBeenCalled();
	});

	it('silently ignores bots without delivery', async () => {
		const deliver = vi.fn();
		const response = await handleForm(request(form, { 'bot-field': 'bot', email: '' }), form, deliver);
		expect(response.status).toBe(303);
		expect(deliver).not.toHaveBeenCalled();
	});

	it('rejects cross-origin and missing origin', async () => {
		const deliver = vi.fn();
		for (const origin of ['https://evil.example', 'null', '']) {
			expect((await handleForm(request(form, {}, { origin }), form, deliver)).status).toBe(403);
		}
		expect(deliver).not.toHaveBeenCalled();
	});

	it('returns 503 rather than redirecting on delivery failure', async () => {
		const response = await handleForm(request(form), form, async () => { throw new Error('rejected'); });
		expect(response.status).toBe(503);
		expect(response.headers.get('location')).toBeNull();
	});
});

describe('form request boundaries', () => {
	it.each<Record<string, string>>([
		{ company_website: 'javascript:alert(1)' },
		{ company_website: '' },
		{ referral_source: 'unknown' },
		{ first_name: '' },
		{ last_name: 'x'.repeat(101) },
		{ phone: 'x'.repeat(101) },
	])('rejects invalid demo fields %j', async (extra) => {
		const deliver = vi.fn();
		expect((await handleForm(request('demo-request', extra), 'demo-request', deliver)).status).toBe(400);
		expect(deliver).not.toHaveBeenCalled();
	});

	it('accepts omitted optional demo fields', async () => {
		const original = request('demo-request');
		const body = new URLSearchParams(await original.text());
		body.delete('phone');
		body.delete('referral_source');
		const req = new Request(original.url, { method: 'POST', headers: original.headers, body });
		expect((await handleForm(req, 'demo-request', async () => {})).status).toBe(303);
	});

	it('rejects unsupported media types and methods', async () => {
		const deliver = vi.fn();
		expect((await handleForm(request('contact-message', {}, { 'content-type': 'application/json' }), 'contact-message', deliver)).status).toBe(415);
		expect((await handleForm(new Request('https://ringlume.com/api/form'), 'contact-message', deliver)).status).toBe(405);
		expect(deliver).not.toHaveBeenCalled();
	});

	it('caps streamed bodies without Content-Length and with a false small length', async () => {
		for (const headers of [{}, { 'content-length': '1' }]) {
			const req = request('contact-message', { message: 'x'.repeat(MAX_FORM_BYTES) }, headers);
			const deliver = vi.fn();
			expect((await handleForm(req, 'contact-message', deliver)).status).toBe(413);
			expect(deliver).not.toHaveBeenCalled();
		}
	});

	it('rejects oversized declared bodies, duplicate fields and malformed encoding', async () => {
		const deliver = vi.fn();
		expect((await handleForm(request('contact-message', {}, { 'content-length': `${MAX_FORM_BYTES + 1}` }), 'contact-message', deliver)).status).toBe(413);
		for (const suffix of ['&email=another@example.com', '&message=%ZZ', '&message=%FF']) {
			const original = request('contact-message');
			const req = new Request(original.url, { method: 'POST', headers: original.headers, body: await original.text() + suffix });
			expect((await handleForm(req, 'contact-message', deliver)).status).toBe(400);
		}
		expect(deliver).not.toHaveBeenCalled();
	});

	it('rejects empty or oversized contact messages', async () => {
		for (const message of ['', 'x'.repeat(2001)]) {
			expect((await handleForm(request('contact-message', { message }), 'contact-message', async () => {})).status).toBe(400);
		}
	});
});
