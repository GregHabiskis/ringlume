export type RetellEnv = {
	PUBLIC_RETELL_VOICE_PUBLIC_KEY?: string
	PUBLIC_RETELL_VOICE_AGENT_ID?: string
	PUBLIC_RETELL_RECAPTCHA_KEY?: string
}

export type RetellConfig = {
	voicePublicKey: string
	voiceAgentId: string
	recaptchaKey?: string
}

const PLACEHOLDER_PATTERN = /<[^>]*>|replace[_-]?me/i

export function isUsableRetellValue(value: string | undefined): boolean {
	if (!value) return false

	const trimmed = value.trim()
	return trimmed.length > 0 && !PLACEHOLDER_PATTERN.test(trimmed)
}

export function resolveRetellConfig(env: RetellEnv): RetellConfig | null {
	const voicePublicKey = env.PUBLIC_RETELL_VOICE_PUBLIC_KEY?.trim() ?? ''
	const voiceAgentId = env.PUBLIC_RETELL_VOICE_AGENT_ID?.trim() ?? ''
	const recaptchaKey = env.PUBLIC_RETELL_RECAPTCHA_KEY?.trim() ?? ''

	if (
		!isUsableRetellValue(voicePublicKey) ||
		!isUsableRetellValue(voiceAgentId)
	) {
		return null
	}

	return {
		voicePublicKey,
		voiceAgentId,
		recaptchaKey: isUsableRetellValue(recaptchaKey)
			? recaptchaKey
			: undefined,
	}
}

export function getRetellConfig(): RetellConfig | null {
	return resolveRetellConfig({
		PUBLIC_RETELL_VOICE_PUBLIC_KEY:
			import.meta.env.PUBLIC_RETELL_VOICE_PUBLIC_KEY,
		PUBLIC_RETELL_VOICE_AGENT_ID: import.meta.env.PUBLIC_RETELL_VOICE_AGENT_ID,
		PUBLIC_RETELL_RECAPTCHA_KEY: import.meta.env.PUBLIC_RETELL_RECAPTCHA_KEY,
	})
}
