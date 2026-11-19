import type { APIRoute } from 'astro';
import { deliverFormEmail } from '../../lib/cloudflare-form-email';
import { handleForm } from '../../lib/form-handler';

export const prerender = false;
export const POST: APIRoute = ({ request }) =>
	handleForm(request, 'contact-message', deliverFormEmail);
