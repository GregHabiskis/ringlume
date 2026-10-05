// Capture a CDP trace of the page under 4x CPU throttle, then attribute
// main-thread long tasks (used with trace-analyze.mjs).
//   node tbt-trace.mjs [windowMs] [outFile]
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { writeFileSync } from 'node:fs'

const WINDOW = Number(process.argv[2] || 10000)
const OUT = process.argv[3] || 'reports/local/cdp-trace.json'
const URL_ = process.env.MEASURE_URL || 'http://localhost:4321/'
const CSS = process.env.INJECT_CSS || ''
const PORT = 9800 + Math.floor(Math.random() * 150)

const chrome = spawn(
	'chromium',
	[
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		'--no-sandbox',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		`--user-data-dir=/tmp/opencode/trace-profile-${PORT}`,
		'--no-first-run',
		'--hide-scrollbars',
		'about:blank',
	],
	{ stdio: 'ignore' },
)

let ws
let msgId = 0
const pending = new Map()
const traceEvents = []

function send(method, params = {}) {
	const id = ++msgId
	ws.send(JSON.stringify({ id, method, params }))
	return new Promise((res, rej) => pending.set(id, { res, rej }))
}

async function connect() {
	for (let i = 0; i < 60; i++) {
		try {
			const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
			const page = list.find((t) => t.type === 'page')
			if (page) {
				ws = new WebSocket(page.webSocketDebuggerUrl)
				await new Promise((res, rej) => {
					ws.onopen = res
					ws.onerror = rej
				})
				ws.onmessage = (m) => {
					const msg = JSON.parse(m.data)
					if (msg.id && pending.has(msg.id)) {
						const { res, rej } = pending.get(msg.id)
						pending.delete(msg.id)
						msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
					} else if (msg.method === 'Tracing.dataCollected') {
						traceEvents.push(...msg.params.value)
					} else if (process.env.TRACE_DEBUG) {
						console.log('MSG', msg.method || JSON.stringify(msg).slice(0, 200))
					}
				}
				return
			}
		} catch {}
		await sleep(200)
	}
	throw new Error('cannot connect')
}

const cssLiteral = JSON.stringify(CSS)
const INJECT = CSS
	? `(() => { const css = ${cssLiteral}; const apply = () => { const s = document.createElement('style'); s.id='__inject'; s.textContent = css; (document.head||document.documentElement).appendChild(s); }; if (document.documentElement) apply(); else document.addEventListener('DOMContentLoaded', apply, {once:true}); })();`
	: ''

try {
	await connect()
	// Trace first: enabling Page/Runtime domains before Tracing.start made the
	// session return zero events in headless Chromium.
	const startRes = await send('Tracing.start', { categories: '*', transferMode: 'ReportEvents' })
	if (!startRes) throw new Error('Tracing.start failed')
	await sleep(300)
	// NB: Page.enable / Runtime.enable made the tracing session emit zero
	// events, so they are deliberately not enabled here.
	await send('Emulation.setDeviceMetricsOverride', {
		width: 390,
		height: 844,
		deviceScaleFactor: 2,
		mobile: true,
		screenWidth: 390,
		screenHeight: 844,
	})
	await send('Emulation.setCPUThrottlingRate', { rate: 4 })
	if (INJECT) await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT })
	await sleep(300)
	await send('Page.navigate', { url: URL_ })
	await sleep(WINDOW)
	await send('Tracing.end')
	await sleep(2500)
	writeFileSync(OUT, JSON.stringify(traceEvents))
	console.log(`wrote ${OUT}: ${traceEvents.length} events`)
} finally {
	ws?.close()
	chrome.kill()
	process.exit(0)
}
