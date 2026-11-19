import { demo as defaultCopy } from '../../content/site/site.json'

export type DemoCopy = typeof defaultCopy
export type DemoMessageKey = keyof DemoCopy['messages']
export type DemoPhase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

export type DemoState = {
	phase: DemoPhase
	muted: boolean
	message: string
	messageKey?: DemoMessageKey
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

export class DemoSetupError extends Error {
	constructor(message: string, readonly copyKey?: DemoMessageKey) {
		super(message)
	}
}

export function getDemoErrorKey(error: unknown): DemoMessageKey {
	if (error instanceof DemoSetupError) return error.copyKey ?? 'loadFailed'
	const detail = error as { name?: string; message?: string; status?: number }
	const name = detail?.name ?? ''
	const message = detail?.message ?? ''
	if (name === 'NotAllowedError' || /permission denied/i.test(message)) {
		return 'permissionBlocked'
	}
	if (name === 'NotFoundError' || /device not found/i.test(message)) {
		return 'microphoneMissing'
	}
	if (name === 'NotReadableError' || name === 'AbortError') {
		return 'microphoneBusy'
	}
	if (detail?.status === 401 || detail?.status === 403) {
		return 'unauthorized'
	}
	if (detail?.status === 429) {
		return 'busy'
	}
	if (/fetch|network|connection|offline/i.test(message)) {
		return 'connectionFailed'
	}
	return 'loadFailed'
}

export function getDemoError(error: unknown, copy: DemoCopy = defaultCopy): string {
	if (error instanceof DemoSetupError && !error.copyKey) return error.message
	return copy.messages[getDemoErrorKey(error)]
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
	copy?: DemoCopy
}) {
	let copy = options.copy ?? defaultCopy
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

	function finish(phase: 'ended' | 'error', messageKey: DemoMessageKey): void {
		attempt++
		clearConnectionTimeout()
		const previous = call
		call = undefined
		update({ phase, muted: false, messageKey, message: copy.messages[messageKey] })
		// Ignore callbacks from the old call, including those emitted by end().
		void previous?.end().catch(() => {})
	}

	async function start(): Promise<void> {
		if (state.phase === 'connecting' || state.phase === 'live') return
		const current = ++attempt
		update({
			phase: 'connecting',
			muted: false,
			messageKey: 'connecting',
			message: copy.messages.connecting,
		})
		timeout = setTimeout(() => {
			finish(
				'error',
				'timeout',
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
						update({ phase: 'live', messageKey: 'connected', message: copy.messages.connected })
						// Playback may still need an explicit user gesture; the card
						// retains an Enable audio control throughout the live call.
						void call?.startAudioPlayback().catch(() => {})
					},
					onEnd() {
						if (current === attempt) finish('ended', 'ended')
					},
					onError(error) {
						if (current === attempt) finish('error', getDemoErrorKey(error))
					},
				},
			})
		} catch (error) {
			if (current === attempt) finish('error', getDemoErrorKey(error))
		}
	}

	function end(): void {
		if (state.phase !== 'connecting' && state.phase !== 'live') return
		finish(
			'ended',
			state.phase === 'connecting' ? 'cancelled' : 'ended',
		)
	}

	function toggleMute(): void {
		if (state.phase !== 'live' || !call) return
		try {
			if (state.muted) call.unmute()
			else call.mute()
			update({ muted: !state.muted })
		} catch (error) {
			finish('error', getDemoErrorKey(error))
		}
	}

	async function enableAudio(): Promise<void> {
		if (state.phase !== 'live' || !call) return
		const current = attempt
		try {
			await call.startAudioPlayback()
			if (current === attempt) {
				update({
					messageKey: 'audioEnabled',
					message: copy.messages.audioEnabled,
				})
			}
		} catch {
			if (current === attempt) {
				update({
					messageKey: 'audioBlocked',
					message: copy.messages.audioBlocked,
				})
			}
		}
	}

	function offline(): void {
		if (state.phase === 'connecting' || state.phase === 'live') {
			finish(
				'error',
				'offline',
			)
		}
	}

	function setCopy(next: DemoCopy): void {
		copy = next
		update({ message: state.messageKey ? copy.messages[state.messageKey] : '' })
	}

	return { start, end, toggleMute, enableAudio, offline, setCopy }
}
