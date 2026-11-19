import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demo as defaultCopy } from '../../../content/site/site.json'
import {
	createDemoController,
	DemoSetupError,
	formatDemoTime,
	getDemoError,
	type DemoCall,
	type DemoClient,
	type DemoState,
} from '../retell-demo'

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
	return { promise, resolve, reject }
}

function setup(overrides: {
	loadClient?: () => Promise<DemoClient>
	prepare?: () => Promise<string | undefined>
} = {}) {
	const sessions: { call: DemoCall; hooks: Parameters<DemoClient['createWebCall']>[0]['hooks'] }[] = []
	const createWebCall = vi.fn<DemoClient['createWebCall']>((options) => {
		const call = {
			end: vi.fn(async () => {}),
			mute: vi.fn(),
			unmute: vi.fn(),
			startAudioPlayback: vi.fn(async () => {}),
		}
		sessions.push({ call, hooks: options.hooks })
		return call
	})
	const loadClient = vi.fn(overrides.loadClient ?? (async () => ({ createWebCall })))
	const prepare = vi.fn(overrides.prepare ?? (async () => undefined))
	const states: DemoState[] = []
	const controller = createDemoController({
		agentId: 'agent_test',
		loadClient,
		prepare,
		onChange: (state) => states.push(state),
	})
	return { controller, createWebCall, loadClient, prepare, sessions, states, latest: () => states.at(-1)! }
}

describe('inline Retell call lifecycle', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	it('loads nothing until clicked and prevents duplicate connecting and live calls', async () => {
		const demo = setup()
		expect(demo.loadClient).not.toHaveBeenCalled()
		expect(demo.prepare).not.toHaveBeenCalled()
		const starting = demo.controller.start()
		await demo.controller.start()
		await starting
		expect(demo.createWebCall).toHaveBeenCalledOnce()
		expect(demo.latest().phase).toBe('connecting')
		demo.sessions[0].hooks.onStatus('live')
		await demo.controller.start()
		expect(demo.createWebCall).toHaveBeenCalledOnce()
		expect(demo.latest().phase).toBe('live')
		expect(vi.getTimerCount()).toBe(0)
	})

	it('waits for microphone permission before creating the call and passes a fresh captcha token', async () => {
		const permission = deferred<string | undefined>()
		const demo = setup({ prepare: () => permission.promise })
		const starting = demo.controller.start()
		await Promise.resolve()
		expect(demo.createWebCall).not.toHaveBeenCalled()
		permission.resolve('fresh_token')
		await starting
		expect(demo.createWebCall).toHaveBeenCalledWith(expect.objectContaining({ agent_id: 'agent_test', recaptchaToken: 'fresh_token' }))
	})

	it('does not create a call after cancellation while permission is pending', async () => {
		const permission = deferred<string | undefined>()
		const demo = setup({ prepare: () => permission.promise })
		const starting = demo.controller.start()
		demo.controller.end()
		permission.resolve(undefined)
		await starting
		expect(demo.createWebCall).not.toHaveBeenCalled()
		expect(demo.latest()).toMatchObject({ phase: 'ended', message: 'Call cancelled.' })
		expect(vi.getTimerCount()).toBe(0)
	})

	it('ends a connecting session and ignores its late events after retry', async () => {
		const demo = setup()
		await demo.controller.start()
		const old = demo.sessions[0]
		demo.controller.end()
		expect(old.call.end).toHaveBeenCalledOnce()
		await demo.controller.start()
		old.hooks.onStatus('live')
		old.hooks.onError(new Error('stale failure'))
		old.hooks.onEnd()
		expect(demo.latest().phase).toBe('connecting')
		demo.sessions[1].hooks.onStatus('live')
		expect(demo.latest().phase).toBe('live')
	})

	it('mutes and unmutes only an active call and resets controls on hangup', async () => {
		const demo = setup()
		demo.controller.toggleMute()
		await demo.controller.start()
		const { call, hooks } = demo.sessions[0]
		demo.controller.toggleMute()
		expect(call.mute).not.toHaveBeenCalled()
		hooks.onStatus('live')
		demo.controller.toggleMute()
		expect(call.mute).toHaveBeenCalledOnce()
		expect(demo.latest().muted).toBe(true)
		demo.controller.toggleMute()
		expect(call.unmute).toHaveBeenCalledOnce()
		demo.controller.end()
		expect(demo.latest()).toMatchObject({ phase: 'ended', muted: false })
		expect(call.end).toHaveBeenCalledOnce()
	})

	it('retains useful permission errors when the SDK also emits ended', async () => {
		const demo = setup()
		await demo.controller.start()
		const { call, hooks } = demo.sessions[0]
		hooks.onError(new DOMException('Permission denied', 'NotAllowedError'))
		hooks.onStatus('ended')
		hooks.onEnd()
		expect(demo.latest().phase).toBe('error')
		expect(demo.latest().message).toContain('Microphone access was blocked')
		expect(call.end).toHaveBeenCalledOnce()
	})

	it('handles agent-ended calls without requiring an error event', async () => {
		const demo = setup()
		await demo.controller.start()
		demo.sessions[0].hooks.onStatus('live')
		demo.sessions[0].hooks.onEnd()
		expect(demo.latest()).toMatchObject({ phase: 'ended', message: 'Call ended.' })
		expect(vi.getTimerCount()).toBe(0)
		await demo.controller.start()
		expect(demo.createWebCall).toHaveBeenCalledTimes(2)
	})

	it('allows a retry after a lazy SDK load failure', async () => {
		const load = vi.fn().mockRejectedValueOnce(new Error('chunk failed')).mockResolvedValue({ createWebCall: vi.fn() })
		const demo = setup({ loadClient: load })
		await demo.controller.start()
		expect(demo.latest().phase).toBe('error')
		expect(demo.latest().message).toContain('The demo could not load.')
		await demo.controller.start()
		expect(load).toHaveBeenCalledTimes(2)
		expect(demo.latest().phase).toBe('connecting')
	})

	it('does not create a paid session when microphone access is denied', async () => {
		const demo = setup({ prepare: async () => { throw new DOMException('', 'NotAllowedError') } })
		await demo.controller.start()
		expect(demo.createWebCall).not.toHaveBeenCalled()
		expect(demo.latest().phase).toBe('error')
		expect(vi.getTimerCount()).toBe(0)
	})

	it('times out a stalled connection and ignores late SDK or permission completion', async () => {
		const permission = deferred<string | undefined>()
		const demo = setup({ prepare: () => permission.promise })
		const starting = demo.controller.start()
		vi.advanceTimersByTime(45000)
		expect(demo.latest().message).toContain('timed out')
		permission.resolve(undefined)
		await starting
		expect(demo.createWebCall).not.toHaveBeenCalled()
		await demo.controller.start()
		vi.advanceTimersByTime(45000)
		expect(demo.sessions[0].call.end).toHaveBeenCalledOnce()
		demo.sessions[0].hooks.onStatus('live')
		expect(demo.latest().phase).toBe('error')
	})

	it('disconnects when going offline but leaves an idle card alone', async () => {
		const demo = setup()
		demo.controller.offline()
		expect(demo.states).toHaveLength(0)
		await demo.controller.start()
		demo.sessions[0].hooks.onStatus('live')
		demo.controller.offline()
		expect(demo.sessions[0].call.end).toHaveBeenCalledOnce()
		expect(demo.latest().message).toContain('offline')
	})

	it('resumes blocked audio without starting a second call', async () => {
		const demo = setup()
		await demo.controller.start()
		const { call, hooks } = demo.sessions[0]
		hooks.onStatus('live')
		vi.mocked(call.startAudioPlayback).mockRejectedValueOnce(new Error('autoplay blocked'))
		await demo.controller.enableAudio()
		expect(demo.latest().message).toContain('Allow sound or autoplay')
		expect(demo.latest().phase).toBe('live')
		await demo.controller.enableAudio()
		expect(demo.latest().message).toContain('Audio enabled')
		expect(demo.createWebCall).toHaveBeenCalledOnce()
	})

	it('ignores late playback completion after hangup', async () => {
		const demo = setup()
		await demo.controller.start()
		const { call, hooks } = demo.sessions[0]
		hooks.onStatus('live')
		const playback = deferred<void>()
		vi.mocked(call.startAudioPlayback).mockReturnValueOnce(playback.promise)
		const enabling = demo.controller.enableAudio()
		demo.controller.end()
		playback.resolve()
		await enabling
		expect(demo.latest().message).toBe('Call ended.')
	})

	it('refreshes live copy without reconnecting, unmuting, or ending the active call', async () => {
		const demo = setup()
		await demo.controller.start()
		const { call, hooks } = demo.sessions[0]
		hooks.onStatus('live')
		demo.controller.toggleMute()
		const copy = structuredClone(defaultCopy)
		copy.messages.connected = 'Speak with Ava now.'
		demo.controller.setCopy(copy)
		expect(demo.latest()).toMatchObject({
			phase: 'live', muted: true, messageKey: 'connected', message: 'Speak with Ava now.',
		})
		expect(demo.createWebCall).toHaveBeenCalledOnce()
		expect(call.end).not.toHaveBeenCalled()
		expect(call.unmute).not.toHaveBeenCalled()
	})

	it('keeps a pending connection and its original timeout when copy changes', async () => {
		const permission = deferred<string | undefined>()
		const demo = setup({ prepare: () => permission.promise })
		const starting = demo.controller.start()
		vi.advanceTimersByTime(44000)
		const copy = structuredClone(defaultCopy)
		copy.messages.connecting = 'Waiting for your microphone.'
		copy.messages.timeout = 'Please check your connection.'
		demo.controller.setCopy(copy)
		expect(demo.latest().message).toBe('Waiting for your microphone.')
		expect(vi.getTimerCount()).toBe(1)
		vi.advanceTimersByTime(1000)
		expect(demo.latest()).toMatchObject({
			phase: 'error', messageKey: 'timeout', message: 'Please check your connection.',
		})
		permission.resolve(undefined)
		await starting
		expect(demo.createWebCall).not.toHaveBeenCalled()
	})

	it('refreshes an existing permission error from its semantic key and uses new copy on retry', async () => {
		const demo = setup({ prepare: async () => { throw new DOMException('', 'NotAllowedError') } })
		await demo.controller.start()
		const copy = structuredClone(defaultCopy)
		copy.messages.permissionBlocked = 'Please allow your microphone.'
		copy.messages.connecting = 'Ava is connecting.'
		demo.controller.setCopy(copy)
		expect(demo.latest()).toMatchObject({
			phase: 'error', messageKey: 'permissionBlocked', message: 'Please allow your microphone.',
		})
		const retry = demo.controller.start()
		expect(demo.latest().message).toBe('Ava is connecting.')
		await retry
		expect(demo.latest().message).toBe('Please allow your microphone.')
		expect(demo.createWebCall).not.toHaveBeenCalled()
	})

	it('resolves browser setup errors using the active dictionary rather than the original message', async () => {
		const demo = setup({ prepare: async () => { throw new DemoSetupError('Old browser message', 'unsupported') } })
		await demo.controller.start()
		const copy = structuredClone(defaultCopy)
		copy.messages.unsupported = 'Open a supported browser.'
		demo.controller.setCopy(copy)
		expect(demo.latest().message).toBe('Open a supported browser.')
	})
})

describe('demo presentation helpers', () => {
	it.each([[0, '00:00'], [9.9, '00:09'], [60, '01:00'], [600, '10:00'], [-1, '00:00']])('formats %s seconds as %s', (seconds, expected) => {
		expect(formatDemoTime(seconds)).toBe(expected)
	})

	it.each([
		[{ name: 'NotFoundError' }, 'No microphone'],
		[{ name: 'NotReadableError' }, 'another app'],
		[{ status: 401 }, 'authorize'],
		[{ status: 403 }, 'authorize'],
		[{ status: 429 }, 'busy'],
		[new Error('Failed to fetch'), 'internet connection'],
		[null, 'could not load'],
	])('gives a useful error for %j', (error, text) => {
		expect(getDemoError(error)).toContain(text)
	})

	it('does not leak arbitrary upstream error details into the page', () => {
		expect(getDemoError(new Error('secret upstream details'))).not.toContain('secret')
		expect(getDemoError(new DemoSetupError('Use HTTPS.'))).toBe('Use HTTPS.')
	})
})
