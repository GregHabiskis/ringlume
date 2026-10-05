// Stable local main-thread cost proxy: CDP Performance.getMetrics deltas under
// 4x CPU throttle over a fixed window, plus buffered long tasks.
//   INJECT_CSS='...' LABEL=name node perf-metrics.mjs [runs] [windowMs]
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const RUNS = Number(process.argv[2] || 5)
const WINDOW = Number(process.argv[3] || 6000)
const SETTLE = Number(process.argv[4] || 1500) // window starts this long after nav
const URL_ = process.env.MEASURE_URL || 'http://localhost:4321/'
const CSS = process.env.INJECT_CSS || ''
const LABEL = process.env.LABEL || 'baseline'
const PORT = 9500 + Math.floor(Math.random() * 300)

const chrome = spawn(
	'chromium',
	[
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		'--no-sandbox',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		`--user-data-dir=/tmp/opencode/perf-profile-${PORT}`,
		'--no-first-run',
		'--hide-scrollbars',
		'about:blank',
	],
	{ stdio: 'ignore' },
)

let ws
let msgId = 0
const pending = new Map()

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
					}
				}
				return
			}
		} catch {}
		await sleep(200)
	}
	throw new Error('cannot connect to chromium')
}

const cssLiteral = JSON.stringify(CSS)
const OBSERVER = CSS
	? `(() => { const css = ${cssLiteral}; const apply = () => { const s = document.createElement('style'); s.id='__inject'; s.textContent = css; (document.head||document.documentElement).appendChild(s); }; if (document.documentElement) apply(); else document.addEventListener('DOMContentLoaded', apply, {once:true}); })();`
	: ''

const metricMap = (metrics) => Object.fromEntries(metrics.map((m) => [m.name, m.value]))

async function runOnce(first) {
	if (first) {
		await send('Page.enable')
		await send('Runtime.enable')
		await send('Performance.enable')
		await send('Emulation.setDeviceMetricsOverride', {
			width: 390,
			height: 844,
			deviceScaleFactor: 2,
			mobile: true,
			screenWidth: 390,
			screenHeight: 844,
		})
		await send('Emulation.setCPUThrottlingRate', { rate: 4 })
		if (OBSERVER) await send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER })
	}
	await send('Page.navigate', { url: URL_ })
	await sleep(SETTLE)
	const m0 = metricMap((await send('Performance.getMetrics')).metrics)
	await sleep(WINDOW)
	const m1 = metricMap((await send('Performance.getMetrics')).metrics)
	const evalRes = await send('Runtime.evaluate', {
		expression: `JSON.stringify({
			els: document.querySelectorAll('*').length,
			h: document.documentElement.scrollHeight,
			injected: !!document.getElementById('__inject'),
			injectParent: (document.getElementById('__inject')||{}).parentNode && document.getElementById('__inject').parentNode.nodeName,
			pulseAnim: (() => { const e = document.querySelector('.status-pulse'); return e ? getComputedStyle(e).animationName + '/' + getComputedStyle(e).animationPlayState : 'none' })(),
			pulseAfter: (() => { const e = document.querySelector('.status-pulse'); return e ? getComputedStyle(e, '::after').animationName + '|bg=' + getComputedStyle(e, '::after').backgroundColor : 'n/a' })(),
			ringAnim: (() => { const e = document.querySelector('.hero-ring'); return e ? getComputedStyle(e).animationName + '/' + getComputedStyle(e).animationPlayState : 'none' })()
		})`,
		returnByValue: true,
	})
	const page = JSON.parse(evalRes.result.value)
	const d = (k) => Math.round(((m1[k] || 0) - (m0[k] || 0)) * 1000)
	return {
		task: d('TaskDuration'),
		style: d('RecalcStyleDuration'),
		layout: d('LayoutDuration'),
		script: d('ScriptDuration'),
		styleCount: d('RecalcStyleCount'),
		layoutCount: d('LayoutCount'),
		...page,
	}}

function median(arr) {
	const s = [...arr].sort((a, b) => a - b)
	return s[Math.floor(s.length / 2)]
}

try {
	await connect()
	const results = []
	for (let i = 0; i < RUNS; i++) results.push(await runOnce(i === 0))
	console.log(`[${LABEL}] css=${CSS ? 'yes' : 'no'} runs=${RUNS} window=${WINDOW}ms settle=${SETTLE}ms`)
	results.forEach((r, i) =>
		console.log(
			`run${i + 1}: task=${r.task}ms style=${r.style}ms layout=${r.layout}ms script=${r.script}ms styleN=${r.styleCount} layoutN=${r.layoutCount} els=${r.els} h=${r.h} injected=${r.injected}(${r.injectParent}) pulse=${r.pulseAnim} after=${r.pulseAfter} ring=${r.ringAnim}`,
		),
	)
	const core = results.slice(1) // drop warm-up run
	const pick = (k) => median(core.map((r) => r[k]))
	console.log(
		`[${LABEL}] MEDIAN task=${pick('task')}ms style=${pick('style')}ms layout=${pick('layout')}ms script=${pick('script')}ms styleN=${pick('styleCount')} layoutN=${pick('layoutCount')}`,
	)
} finally {
	ws?.close()
	chrome.kill()
	process.exit(0)
}
