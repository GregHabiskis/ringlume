import { createHmac, timingSafeEqual } from 'node:crypto';
const BACKGROUND_FUNCTION_PATH =
	'/.netlify/functions/paddle-webhook-background';
export const QUEUE_SIGNATURE_HEADER = 'X-Ringlume-Webhook-Queue-Signature';

export interface PaddleWebhookQueueEnvelope {
	event_id: string;
	correlation_id: string;
	source_request_id: string | null;
}

export function signPaddleWebhookQueuePayload(
	body: string,
	secret: string,
): string {
	return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyPaddleWebhookQueuePayload(
	body: string,
	secret: string,
	signature: string | null,
): boolean {
	if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;

	const expected = Buffer.from(
		signPaddleWebhookQueuePayload(body, secret),
		'hex',
	);
	const received = Buffer.from(signature, 'hex');
	return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function enqueuePaddleWebhookEvent(options: {
	eventId: string;
	secret: string;
	requestUrl: URL;
	correlationId: string;
	sourceRequestId: string | null;
}): Promise<void> {
	const envelope: PaddleWebhookQueueEnvelope = {
		event_id: options.eventId,
		correlation_id: options.correlationId,
		source_request_id: options.sourceRequestId,
	};
	const body = JSON.stringify(envelope);
	const response = await fetch(
		new URL(BACKGROUND_FUNCTION_PATH, options.requestUrl.origin),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				[QUEUE_SIGNATURE_HEADER]: signPaddleWebhookQueuePayload(
					body,
					options.secret,
				),
			},
			body,
			signal: AbortSignal.timeout(4000),
		},
	);

	if (response.status !== 202) {
		throw new Error(
			`Netlify background webhook queue returned HTTP ${response.status}`,
		);
	}
}
