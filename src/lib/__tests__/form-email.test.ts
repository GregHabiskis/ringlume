import { describe, expect, it } from 'vitest';
import { buildFormEmail } from '../form-email';
import type { Submission } from '../form-handler';

const contact: Submission = {
	form: 'contact-message',
	fields: {
		email: 'visitor@example.com',
		message: 'Hello 🌳 café\r\nBcc: injected@example.com\r\n' + '枝'.repeat(100),
	},
};
const demo: Submission = {
	form: 'demo-request',
	fields: {
		first_name: 'Jane',
		last_name: 'Smith',
		email: 'visitor@example.com',
		company_website: 'example.com',
		phone: '',
		referral_source: '',
	},
};

describe('form MIME email', () => {
	it.each([contact, demo])('encodes UTF-8 payload with fixed headers for $form', (submission) => {
		const email = buildFormEmail(submission, 'forms@ringlume.com', 'owner@example.com');
		expect(email.from).toBe('forms@ringlume.com');
		expect(email.to).toBe('owner@example.com');
		const [headers, body] = email.raw.split('\r\n\r\n');
		expect(headers.split('\r\n')).toEqual([
			expect.stringMatching(/^Date: .+ \+0000$/),
			expect.stringMatching(/^Message-ID: <[a-f0-9-]{36}@ringlume\.com>$/),
			'From: forms@ringlume.com',
			'To: owner@example.com',
			submission.form === 'contact-message'
				? 'Subject: Ringlume contact message'
				: 'Subject: Ringlume demo request',
			'MIME-Version: 1.0',
			'Content-Type: text/plain; charset=UTF-8',
			'Content-Transfer-Encoding: base64',
		]);
		expect(headers).not.toContain('visitor@example.com');
		expect(headers).not.toContain('Bcc:');
		const lines = body.trimEnd().split('\r\n');
		for (const line of lines) {
			expect(line.length).toBeLessThanOrEqual(76);
			expect(line).toMatch(/^[A-Za-z0-9+/]+=*$/);
		}
		expect(lines.slice(0, -1).every((line) => line.length === 76)).toBe(true);
		expect(Buffer.from(lines.join(''), 'base64').toString('utf8')).toBe(
			Object.entries(submission.fields).map(([key, value]) => `${key}: ${value}`).join('\r\n'),
		);
		expect(email.raw.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
	});

	it.each([
		undefined,
		'',
		'Name <owner@example.com>',
		'owner@example.com\r\nBcc: other@example.com',
		'owner@example.com\n',
		'café@example.com',
		'owner@localhost',
		'owner@-example.com',
		'owner@example..com',
		`${'a'.repeat(65)}@example.com`,
		`owner@${'a'.repeat(64)}.com`,
	])('rejects invalid configured mailbox %j', (address) => {
		expect(() => buildFormEmail(contact, address, 'owner@example.com')).toThrow();
		expect(() => buildFormEmail(contact, 'forms@ringlume.com', address)).toThrow();
	});
});
