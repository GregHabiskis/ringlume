// Deterministic local TBT proxy: headless Chromium + CDP 4x CPU throttle,
// measures buffered long tasks. Splits load-phase vs steady-state phase, and
// can inject a CSS snippet before load to A/B a suspected cost.
//   node tbt-measure.mjs [runs] [windowMs]
//   INJECT_CSS='...' node tbt-measure.mjs [runs] [windowMs]
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const RUNS = Number(process.argv[2] || 5)
const WINDOW = Number(process.argv[3] || 10000)
const LOAD_PHASE_MS = Number(process.argv[4] || 3000)
const URL_ = process.env.MEASURE_URL || 'http://localhost:4321/'
const CSS = process.env.INJECT_CSS || ''
const LABEL = process.env.LABEL || 'baseline'
const PORT = 9400 + Math.floor(Math.random() * 400)

const chrome = spawn(
	'chromium',
	[
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		'--no-sandbox',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		`--user-data-dir=/tmp/opencode/tbt-profile-${PORT}`,
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
const OBSERVER = `
window.__lt = [];
window.__mark = 0;
${CSS ? `
(() => {
  const css = ${cssLiteral};
  const apply = () => {
    const s = document.createElement('style');
    s.id = '__inject';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.documentElement) apply();
  else document.addEventListener('DOMContentLoaded', apply, { once: true });
})();
` : ''}
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lt.push([e.startTime, e.duration]);
  }).observe({ type: 'longtask', buffered: true });
} catch (err) {}
window.__cls = 0;
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
} catch (err) {}
try {
  new PerformanceObserver((list) => {
    const e = list.getEntries().pop();
    if (e) window.__lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch (err) {}
`

function stats(tasks, from, to) {
	const sel = tasks.filter(([t]) => t >= from && t < to)
	return {
		total: Math.round(sel.reduce((a, [, d]) => a + d, 0)),
		blocking: Math.round(sel.reduce((a, [, d]) => a + Math.max(0, d - 50), 0)),
		count: sel.length,
		worst: Math.round(Math.max(0, ...sel.map(([, d]) => d))),
	}
}

async function runOnce() {
	await send('Page.enable')
	await send('Runtime.enable')
	await send('Emulation.setDeviceMetricsOverride', {
		width: 390,
		height: 844,
		deviceScaleFactor: 2,
		mobile: true,
		screenWidth: 390,
		screenHeight: 844,
	})
	await send('Emulation.setCPUThrottlingRate', { rate: 4 })
	await send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER })
	const navStart = Date.now()
	await send('Page.navigate', { url: URL_ })
	await sleep(WINDOW)
	const elapsed = Date.now() - navStart
	const evalRes = await send('Runtime.evaluate', {
		expression: `JSON.stringify({
			lt: window.__lt || [],
			cls: window.__cls,
			lcp: window.__lcp || null,
			fcp: (performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime || null,
			els: document.querySelectorAll('*').length,
			injected: !!document.getElementById('__inject')
		})`,
		returnByValue: true,
	})
	const d = JSON.parse(evalRes.result.value)
	const loadPhase = stats(d.lt, 0, LOAD_PHASE_MS)
	const steady = stats(d.lt, LOAD_PHASE_MS, elapsed)
	await send('Page.navigate', { url: 'about:blank' })
	await sleep(400)
	return { ...d, loadPhase, steady, elapsed }
}

function median(arr) {
	const s = [...arr].sort((a, b) => a - b)
	return s[Math.floor(s.length / 2)]
}

try {
	await connect()
	const results = []
	for (let i = 0; i < RUNS; i++) results.push(await runOnce())
	const line = (r, i) =>
		`run${i + 1}: loadTBT=${r.loadPhase.blocking}ms(${r.loadPhase.count} tasks, worst ${r.loadPhase.worst}) steadyTBT=${r.steady.blocking}ms(${r.steady.count}) FCP=${Math.round(r.fcp || 0)} LCP=${Math.round(r.lcp || 0)} CLS=${r.cls.toFixed(3)}`
	console.log(`[${LABEL}] css=${CSS ? 'yes' : 'no'} runs=${RUNS} window=${WINDOW}ms loadPhase=${LOAD_PHASE_MS}ms`)
	console.log(results.map(line).join('\n'))
	console.log(
		`[${LABEL}] MEDIAN loadTBT=${median(results.map((r) => r.loadPhase.blocking))}ms steadyTBT=${median(results.map((r) => r.steady.blocking))}ms`,
	)
} finally {
	ws?.close()
	chrome.kill()
	process.exit(0)
}
