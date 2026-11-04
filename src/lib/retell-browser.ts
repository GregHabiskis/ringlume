import type { RetellClient } from 'retell-client-js-sdk'
import { DemoSetupError } from './retell-demo'

type Recaptcha = {
	ready(callback: () => void): void
	execute(key: string, options: { action: string }): Promise<string>
}

let sdk: Promise<typeof import('retell-client-js-sdk')> | undefined
let recaptchaScript: Promise<Recaptcha> | undefined

export async function loadRetellClient(key: string): Promise<RetellClient> {
	// Keep the SDK and its audio dependencies out of the initial page load.
	sdk ??= import('retell-client-js-sdk').catch((error) => {
		sdk = undefined
		throw error
	})
	const { RetellClient } = await sdk
	return new RetellClient({ key })
}

async function loadRecaptcha(key: string): Promise<Recaptcha> {
	recaptchaScript ??= new Promise<Recaptcha>((resolve, reject) => {
		const script = document.createElement('script')
		script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`
		script.async = true
		const timeout = window.setTimeout(failed, 12000)
		function failed(): void {
			window.clearTimeout(timeout)
			script.remove()
			reject(new DemoSetupError(
				'The security check could not load. Check your connection or content blocker, then try again.',
			))
		}
		script.onerror = failed
		script.onload = () => {
			const recaptcha = (window as Window & { grecaptcha?: Recaptcha })
				.grecaptcha
			if (!recaptcha) return failed()
			recaptcha.ready(() => {
				window.clearTimeout(timeout)
				resolve(recaptcha)
			})
		}
		document.head.appendChild(script)
	}).catch((error) => {
		recaptchaScript = undefined
		throw error
	})
	return recaptchaScript
}

export async function prepareRetellCall(
	recaptchaKey?: string,
): Promise<string | undefined> {
	if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
		throw new DemoSetupError(
			'Voice calls need HTTPS and a browser with microphone support. Open ringlume.com in a supported browser.',
		)
	}
	if (!navigator.onLine) {
		throw new DemoSetupError(
			'You are offline. Reconnect to the internet, then try again.',
		)
	}
	// Grant permission before creating a paid session. Always stop this temporary
	// stream, even if the visitor cancels while the permission prompt is open.
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
	stream.getTracks().forEach((track) => track.stop())
	if (!recaptchaKey) return undefined
	const recaptcha = await loadRecaptcha(recaptchaKey)
	try {
		return await recaptcha.execute(recaptchaKey, { action: 'web_call' })
	} catch {
		throw new DemoSetupError('The security check failed. Please try again.')
	}
}
