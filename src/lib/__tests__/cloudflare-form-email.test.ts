import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { POST as contactPost, prerender as contactPrerender } from '../../pages/api/contact';
import { POST as demoPost, prerender as demoPrerender } from '../../pages/api/book-demo';

const { bindings, send, message } = vi.hoisted(() => ({
	bindings: {} as Record<string, unknown>,
	send: vi.fn(),
	message: vi.fn(),
}));
vi.mock('cloudflare:workers', () => ({ env: bindings }));
vi.mock('cloudflare:email', () => ({
	EmailMessage: class {
		constructor(from: string, to: string, raw: string) {
			message(from, to, raw);
		}
	},
}));

function context(demo = false) {
	return {
		request: new Request(`https://ringlume.com/api/${demo ? 'book-demo' : 'contact'}`, {
			method: 'POST',
			headers: { origin: 'https://ringlume.com' },
			body: new URLSearchParams(demo
				? { 'form-name': 'demo-request', email: 'visitor@example.com', first_name: 'Jane', last_name: 'Smith', company_website: 'example.com' }
				: { 'form-name': 'contact-message', email: 'visitor@example.com', message: 'Hello' }),
		}),
	} as APIContext;
}

beforeEach(() => {
	vi.clearAllMocks();
	send.mockResolvedValue(undefined);
	Object.assign(bindings, {
		FORM_EMAIL: { send },
		FORM_EMAIL_FROM: 'forms@ringlume.com',
		FORM_EMAIL_TO: 'owner@example.com',
	});
});

describe('Worker form endpoints', () => {
	it('keeps both endpoints on demand', () => {
		expect(contactPrerender).toBe(false);
		expect(demoPrerender).toBe(false);
	});

	it.each([false, true])('sends an EmailMessage and redirects for demo=%s', async (demo) => {
		const response = await (demo ? demoPost : contactPost)(context(demo));
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe(demo ? '/book-demo/thanks' : '/contact/thanks');
		expect(message).toHaveBeenCalledWith('forms@ringlume.com', 'owner@example.com', expect.stringContaining('Content-Transfer-Encoding: base64\r\n'));
		expect(send).toHaveBeenCalledOnce();
		expect(send.mock.calls[0][0]).toBeInstanceOf(Object);
	});

	it.each(['FORM_EMAIL', 'FORM_EMAIL_FROM', 'FORM_EMAIL_TO'])('returns 503 when %s is missing', async (key) => {
		delete bindings[key];
		const response = await contactPost(context());
		expect(response.status).toBe(503);
		expect(response.headers.get('location')).toBeNull();
		expect(send).not.toHaveBeenCalled();
	});

	it('returns 503 for unsafe mailbox configuration', async () => {
		bindings.FORM_EMAIL_TO = 'owner@example.com\r\nBcc: injected@example.com';
		expect((await contactPost(context())).status).toBe(503);
		expect(send).not.toHaveBeenCalled();
	});

	it('returns 503 if Cloudflare rejects delivery', async () => {
		send.mockRejectedValue(new Error('Rejected'));
		const response = await contactPost(context());
		expect(response.status).toBe(503);
		expect(response.headers.get('location')).toBeNull();
	});
});
