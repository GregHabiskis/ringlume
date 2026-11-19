import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { buildFormEmail } from './form-email';
import type { Submission } from './form-handler';

type FormEmailEnvironment = {
	FORM_EMAIL?: { send(message: EmailMessage): Promise<void> };
	FORM_EMAIL_FROM?: unknown;
	FORM_EMAIL_TO?: unknown;
};

export async function deliverFormEmail(submission: Submission): Promise<void> {
	const bindings = env as FormEmailEnvironment;
	if (typeof bindings.FORM_EMAIL?.send !== 'function')
		throw new Error('Form email binding unavailable');
	const { from, to, raw } = buildFormEmail(
		submission,
		bindings.FORM_EMAIL_FROM,
		bindings.FORM_EMAIL_TO,
	);
	await bindings.FORM_EMAIL.send(new EmailMessage(from, to, raw));
}
