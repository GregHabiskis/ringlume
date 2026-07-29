export function validateServerEnv(): void {
  const required = [
    'PADDLE_API_KEY',
    'PADDLE_ENVIRONMENT',
    'PADDLE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing = required.filter((key) => !import.meta.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(', ')}`
    )
  }
}

export function getWebhookSecret(): string {
  const secret = import.meta.env.PADDLE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('PADDLE_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}
