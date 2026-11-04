export type DemoPhase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

export type DemoState = {
	phase: DemoPhase
	muted: boolean
	message: string
}

export type DemoCall = {
	end(): Promise<void>
	mute(): void
	unmute(): void
	startAudioPlayback(): Promise<void>
}

type DemoHooks = {
	onStatus(status: string): void
	onEnd(): void
	onError(error: Error): void
}

export type DemoClient = {
	createWebCall(options: {
		agent_id: string
		recaptchaToken?: string
		hooks: DemoHooks
	}): DemoCall
}

export class DemoSetupError extends Error {}

export function getDemoError(error: unknown): string {
	if (error instanceof DemoSetupError) return error.message
	const detail = error as { name?: string; message?: string; status?: number }
	const name = detail?.name ?? ''
	const message = detail?.message ?? ''
	if (name === 'NotAllowedError' || /permission denied/i.test(message)) {
		return 'Microphone access was blocked. Allow it in your browser settings, then try again.'
	}
	if (name === 'NotFoundError' || /device not found/i.test(message)) {
		return 'No microphone was found. Connect one, then try again.'
	}
	if (name === 'NotReadableError' || name === 'AbortError') {
		return 'Your microphone could not start. Check whether another app is using it, then try again.'
	}
	if (detail?.status === 401 || detail?.status === 403) {
		return 'The demo could not authorize this call. Try again on ringlume.com or request a personalized demo below.'
	}
	if (detail?.status === 429) {
		return 'The demo is busy. Please wait a moment and try again.'
	}
	if (/fetch|network|connection|offline/i.test(message)) {
		return 'The connection failed. Check your internet connection, then try again.'
	}
	return 'The demo could not load. Please try again or request a personalized demo below.'
}

export function formatDemoTime(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds))
	const minutes = Math.floor(whole / 60).toString().padStart(2, '0')
	return `${minutes}:${(whole % 60).toString().padStart(2, '0')}`
}

// The SDK is injected so connection races can be tested without a microphone,
// browser globals, network access, or a billable call.
export function createDemoController(options: {
	agentId: string
	loadClient(): Promise<DemoClient>
	prepare(): Promise<string | undefined>
	onChange(state: DemoState): void
	connectTimeoutMs?: number
}) {
	let state: DemoState = { phase: 'idle', muted: false, message: '' }
	let call: DemoCall | undefined
	let attempt = 0
	let timeout: ReturnType<typeof setTimeout> | undefined

	function update(next: Partial<DemoState>): void {
		state = { ...state, ...next }
		options.onChange({ ...state })
	}

	function clearConnectionTimeout(): void {
		clearTimeout(timeout)
		timeout = undefined
	}

	function finish(phase: 'ended' | 'error', message: string): void {
		attempt++
		clearConnectionTimeout()
		const previous = call
		call = undefined
		update({ phase, muted: false, message })
		// Ignore callbacks from the old call, including those emitted by end().
		void previous?.end().catch(() => {})
	}

	async function start(): Promise<void> {
		if (state.phase === 'connecting' || state.phase === 'live') return
		const current = ++attempt
		update({
			phase: 'connecting',
			muted: false,
			message: 'Allow microphone access if prompted. Connecting…',
		})
		timeout = setTimeout(() => {
			finish(
				'error',
				'The connection timed out. Check microphone permission and your connection, then try again.',
			)
		}, options.connectTimeoutMs ?? 45000)

		try {
			const [client, recaptchaToken] = await Promise.all([
				options.loadClient(),
				options.prepare(),
			])
			if (current !== attempt) return
			call = client.createWebCall({
				agent_id: options.agentId,
				recaptchaToken,
				hooks: {
					onStatus(status) {
						if (current !== attempt || status !== 'live') return
						clearConnectionTimeout()
						update({ phase: 'live', message: 'Connected. You can speak now.' })
						// Playback may still need an explicit user gesture; the card
						// retains an Enable audio control throughout the live call.
						void call?.startAudioPlayback().catch(() => {})
					},
					onEnd() {
						if (current === attempt) finish('ended', 'Call ended.')
					},
					onError(error) {
						if (current === attempt) finish('error', getDemoError(error))
					},
				},
			})
		} catch (error) {
			if (current === attempt) finish('error', getDemoError(error))
		}
	}

	function end(): void {
		if (state.phase !== 'connecting' && state.phase !== 'live') return
		finish(
			'ended',
			state.phase === 'connecting' ? 'Call cancelled.' : 'Call ended.',
		)
	}

	function toggleMute(): void {
		if (state.phase !== 'live' || !call) return
		try {
			if (state.muted) call.unmute()
			else call.mute()
			update({ muted: !state.muted })
		} catch (error) {
			finish('error', getDemoError(error))
		}
	}

	async function enableAudio(): Promise<void> {
		if (state.phase !== 'live' || !call) return
		const current = attempt
		try {
			await call.startAudioPlayback()
			if (current === attempt) {
				update({
					message: 'Audio enabled. Check your speaker volume if you cannot hear the agent.',
				})
			}
		} catch {
			if (current === attempt) {
				update({
					message: 'Audio is blocked. Allow sound or autoplay for this site in your browser settings, then select Enable audio.',
				})
			}
		}
	}

	function offline(): void {
		if (state.phase === 'connecting' || state.phase === 'live') {
			finish(
				'error',
				'You are offline. Reconnect to the internet, then try again.',
			)
		}
	}

	return { start, end, toggleMute, enableAudio, offline }
}
