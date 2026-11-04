import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Retell browser preparation', () => {
	const stop = vi.fn()
	const getUserMedia = vi.fn()
	const scripts: {
		src?: string
		onload?: () => void
		onerror?: () => void
		remove: ReturnType<typeof vi.fn>
	}[] = []
	let browser: {
		isSecureContext: boolean
		setTimeout: typeof setTimeout
		clearTimeout: typeof clearTimeout
		grecaptcha?: {
			ready(callback: () => void): void
			execute: ReturnType<typeof vi.fn>
		}
	}

	beforeEach(() => {
		vi.resetModules()
		vi.useFakeTimers()
		vi.clearAllMocks()
		scripts.length = 0
		browser = { isSecureContext: true, setTimeout, clearTimeout }
		vi.stubGlobal('window', browser)
		vi.stubGlobal('navigator', {
			onLine: true,
			mediaDevices: { getUserMedia },
		})
		getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] })
		vi.stubGlobal('document', {
			createElement: () => ({ remove: vi.fn() }),
			head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
		})
	})
	afterEach(() => {
		vi.doUnmock('retell-client-js-sdk')
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	it('does not import the SDK until needed and shares the lazy import', async () => {
		const imported = vi.fn()
		const constructed = vi.fn()
		vi.doMock('retell-client-js-sdk', () => {
			imported()
			return {
				RetellClient: class {
					constructor(config: unknown) { constructed(config) }
				},
			}
		})
		const { loadRetellClient } = await import('../retell-browser')
		expect(imported).not.toHaveBeenCalled()
		await Promise.all([
			loadRetellClient('public_key_test'),
			loadRetellClient('public_key_test'),
		])
		expect(imported).toHaveBeenCalledOnce()
		expect(constructed).toHaveBeenCalledTimes(2)
		expect(constructed).toHaveBeenCalledWith({ key: 'public_key_test' })
	})

	it('stops the permission-check stream and never loads captcha when unconfigured', async () => {
		const { prepareRetellCall } = await import('../retell-browser')
		expect(await prepareRetellCall('')).toBeUndefined()
		expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
		expect(stop).toHaveBeenCalledOnce()
		expect(scripts).toHaveLength(0)
	})

	it('releases every temporary microphone track', async () => {
		const secondStop = vi.fn()
		getUserMedia.mockResolvedValue({
			getTracks: () => [{ stop }, { stop: secondStop }],
		})
		const { prepareRetellCall } = await import('../retell-browser')
		await prepareRetellCall()
		expect(stop).toHaveBeenCalledOnce()
		expect(secondStop).toHaveBeenCalledOnce()
	})

	it('releases a microphone granted after the visitor has cancelled', async () => {
		let grant!: (stream: { getTracks(): { stop(): void }[] }) => void
		getUserMedia.mockReturnValue(new Promise((resolve) => { grant = resolve }))
		const { prepareRetellCall } = await import('../retell-browser')
		const { createDemoController } = await import('../retell-demo')
		const createWebCall = vi.fn()
		const controller = createDemoController({
			agentId: 'agent_test',
			loadClient: async () => ({ createWebCall }),
			prepare: () => prepareRetellCall(),
			onChange: vi.fn(),
		})
		const starting = controller.start()
		controller.end()
		grant({ getTracks: () => [{ stop }] })
		await starting
		expect(stop).toHaveBeenCalledOnce()
		expect(createWebCall).not.toHaveBeenCalled()
	})

	it('rejects insecure pages before requesting a microphone', async () => {
		browser.isSecureContext = false
		const { prepareRetellCall } = await import('../retell-browser')
		await expect(prepareRetellCall()).rejects.toThrow('HTTPS')
		expect(getUserMedia).not.toHaveBeenCalled()
	})

	it('rejects offline starts before requesting a microphone', async () => {
		vi.stubGlobal('navigator', { onLine: false, mediaDevices: { getUserMedia } })
		const { prepareRetellCall } = await import('../retell-browser')
		await expect(prepareRetellCall()).rejects.toThrow('offline')
		expect(getUserMedia).not.toHaveBeenCalled()
	})

	it('passes microphone denial back without running a security check', async () => {
		getUserMedia.mockRejectedValue(new DOMException('', 'NotAllowedError'))
		const { prepareRetellCall } = await import('../retell-browser')
		await expect(prepareRetellCall('site_key')).rejects.toMatchObject({ name: 'NotAllowedError' })
		expect(scripts).toHaveLength(0)
	})

	it('loads captcha only on demand and obtains a new token for each call', async () => {
		const { prepareRetellCall } = await import('../retell-browser')
		expect(scripts).toHaveLength(0)
		const preparing = prepareRetellCall('site_key')
		await vi.advanceTimersByTimeAsync(0)
		expect(stop).toHaveBeenCalledOnce()
		expect(scripts).toHaveLength(1)
		browser.grecaptcha = {
			ready: (callback) => callback(),
			execute: vi.fn().mockResolvedValueOnce('token_1').mockResolvedValueOnce('token_2'),
		}
		scripts[0].onload!()
		expect(await preparing).toBe('token_1')
		expect(await prepareRetellCall('site_key')).toBe('token_2')
		expect(scripts).toHaveLength(1)
		expect(browser.grecaptcha.execute).toHaveBeenCalledTimes(2)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('cleans up a failed captcha script and permits retry', async () => {
		const { prepareRetellCall } = await import('../retell-browser')
		const preparing = prepareRetellCall('site_key')
		const failure = expect(preparing).rejects.toThrow('security check could not load')
		await vi.advanceTimersByTimeAsync(0)
		scripts[0].onerror!()
		await failure
		expect(scripts[0].remove).toHaveBeenCalledOnce()
		const retry = prepareRetellCall('site_key')
		await vi.advanceTimersByTimeAsync(0)
		expect(scripts).toHaveLength(2)
		browser.grecaptcha = { ready: (callback) => callback(), execute: vi.fn().mockResolvedValue('retry_token') }
		scripts[1].onload!()
		expect(await retry).toBe('retry_token')
	})

	it('times out blocked captcha loading without leaving a timer running', async () => {
		const { prepareRetellCall } = await import('../retell-browser')
		const preparing = prepareRetellCall('site_key')
		const failure = expect(preparing).rejects.toThrow('security check could not load')
		await vi.advanceTimersByTimeAsync(12000)
		await failure
		expect(scripts[0].remove).toHaveBeenCalledOnce()
		expect(vi.getTimerCount()).toBe(0)
	})

	it('shows a safe error if captcha execution fails', async () => {
		const { prepareRetellCall } = await import('../retell-browser')
		const preparing = prepareRetellCall('site_key')
		const failure = expect(preparing).rejects.toThrow('security check failed')
		await vi.advanceTimersByTimeAsync(0)
		browser.grecaptcha = {
			ready: (callback) => callback(),
			execute: vi.fn().mockRejectedValue(new Error('provider details')),
		}
		scripts[0].onload!()
		await failure
		expect(stop).toHaveBeenCalledOnce()
	})
})
