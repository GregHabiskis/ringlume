export function getWebhookSecret(): string {
  const secret = import.meta.env.PADDLE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('PADDLE_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}
