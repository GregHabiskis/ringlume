import type { Submission } from './form-handler';

// Restrict configuration to bare ASCII mailboxes, never display names or headers.
function mailbox(value: unknown): string {
	if (
		typeof value !== 'string' ||
		value.length > 254 ||
		/\s/.test(value) ||
		!/^([A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*)@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(value) ||
		value.split('@')[0].length > 64 ||
		value.split('@')[1].split('.').some((label) => label.length > 63)
	)
		throw new Error('Invalid form email configuration');
	return value;
}

export function buildFormEmail(
	submission: Submission,
	sender: unknown,
	recipient: unknown,
) {
	const from = mailbox(sender);
	const to = mailbox(recipient);
	const subject = submission.form === 'contact-message'
		? 'Ringlume contact message'
		: 'Ringlume demo request';
	const text = Object.entries(submission.fields)
		.map(([name, value]) => `${name}: ${value}`)
		.join('\r\n');
	const bytes = new TextEncoder().encode(text);
	const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
	const body = encoded.match(/.{1,76}/g)!.join('\r\n');
	const raw = [
		`Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
		`Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${subject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: base64',
		'',
		body,
		'',
	].join('\r\n');
	return { from, to, raw };
}
