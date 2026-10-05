// Paired A/B main-thread cost: alternates control vs treatment CSS within ONE
// browser session so machine drift cancels out.
//   TREAT='.animate-pulse{animation:none!important}' node ab-metrics.mjs [pairs]
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PAIRS = Number(process.argv[2] || 5)
const WINDOW = 6000
const SETTLE = 1500
const URL_ = process.env.MEASURE_URL || 'http://localhost:4321/'
const TREATS = JSON.parse(process.env.TREATS || JSON.stringify([process.env.TREAT || '']))
const CTRL = process.env.CTRL || '.ab-nomatch{--x:0}'
const LABEL = process.env.LABEL || 'ab'
const PORT = 9500 + Math.floor(Math.random() * 300)

const chrome = spawn(
	'chromium',
	[
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		'--no-sandbox',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		`--user-data-dir=/tmp/opencode/ab-profile-${PORT}`,
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

const metricMap = (metrics) => Object.fromEntries(metrics.map((m) => [m.name, m.value]))

async function runOnce(css, url, first) {
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
	}
	await send('Page.navigate', { url })
	await sleep(250)
	const ltPre = await send('Runtime.evaluate', {
		expression: `(() => performance.getEntriesByType('longtask').map(x=>Math.round(x.duration)))()`,
		returnByValue: true,
	})
	await sleep(SETTLE)
	// identical shape for both arms: swap one <style> tag
	await send('Runtime.evaluate', {
		expression: `(() => { let s = document.getElementById('__ab'); if (!s) { s = document.createElement('style'); s.id='__ab'; document.head.appendChild(s); } s.textContent = ${JSON.stringify(css)}; })()`,
	})
	await sleep(600) // let the recalc from injection leave the window
	const lt0 = await send('Runtime.evaluate', {
		expression: `(() => performance.getEntriesByType('longtask').map(x=>Math.round(x.duration)))()`,
		returnByValue: true,
	})
	const m0 = metricMap((await send('Performance.getMetrics')).metrics)
	await sleep(WINDOW)
	const m1 = metricMap((await send('Performance.getMetrics')).metrics)
	const lt1 = await send('Runtime.evaluate', {
		expression: `(() => performance.getEntriesByType('longtask').map(x=>Math.round(x.duration)))()`,
		returnByValue: true,
	})
	const old0 = lt0.result.value.length
	const ltN = lt1.result.value.length - old0
	const newEntries = lt1.result.value.slice(old0)
	const ltMs = newEntries.reduce((a, b) => a + b, 0)
	const ltBlock = newEntries.reduce((a, d) => a + Math.max(0, d - 50), 0)
	// load phase: from 250ms after nav until the window opens (settle + inject)
	const loadEntries = lt0.result.value.slice(ltPre.result.value.length)
	const loadBlock = loadEntries.reduce((a, d) => a + Math.max(0, d - 50), 0)
	const evalRes = await send('Runtime.evaluate', {
		expression: `JSON.stringify({
			ok: document.querySelectorAll('*').length > 400 && document.documentElement.scrollHeight > 5000,
			pulse: (() => { const e = document.querySelector('.animate-pulse'); return e ? getComputedStyle(e).animationName + '/' + getComputedStyle(e).animationPlayState : 'none' })()
		})`,
		returnByValue: true,
	})
	const page = JSON.parse(evalRes.result.value)
	const d = (k) => Math.round(((m1[k] || 0) - (m0[k] || 0)) * 1000)
	return {
		task: d('TaskDuration'),
		style: d('RecalcStyleDuration'),
		script: d('ScriptDuration'),
		ltN,
		ltMs,
		ltBlock,
		loadBlock,
		...page,
	}
}

function median(arr) {
	const s = [...arr].sort((a, b) => a - b)
	return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)
}

try {
	await connect()
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
	console.log(`[${LABEL}] pairs=${PAIRS} window=${WINDOW}ms treatments=${TREATS.length}`)
	await send('Page.navigate', { url: URL_ }) // warm-up navigation (untimed)
	await sleep(3000)
	const buckets = { C: [] }
	TREATS.forEach((_, i) => (buckets[`T${i}`] = []))
	for (let i = 0; i < PAIRS; i++) {
		const URL_B = process.env.URL_B || URL_
		const arms = [['C', CTRL, URL_], ...TREATS.map((t, j) => [`T${j}`, t, URL_B])]
		for (const [arm, css, url] of arms) {
			const r = await runOnce(css, url, false)
			buckets[arm].push(r)
			console.log(
				`${arm}${i}: task=${r.task}ms style=${r.style}ms ltN=${r.ltN} ltMs=${r.ltMs} block=${r.ltBlock}ms loadBlk=${r.loadBlock}ms ok=${r.ok} pulse=${r.pulse}`,
			)
		}
	}
	for (const [arm, rows] of Object.entries(buckets))
		console.log(
			`[${LABEL}] ${arm} median task=${median(rows.map((r) => r.task))}ms style=${median(rows.map((r) => r.style))}ms ltBlock=${median(rows.map((r) => r.ltBlock))}ms ltN=${median(rows.map((r) => r.ltN))}`,
		)
	TREATS.forEach((_, j) => {
		const deltas = buckets.C.map((c, i) => buckets[`T${j}`][i].task - c.task)
		console.log(`[${LABEL}] T${j} deltas: ${deltas.join(', ')} median=${median(deltas)}ms`)
		const bd = buckets.C.map((c, i) => buckets[`T${j}`][i].ltBlock - c.ltBlock)
		console.log(`[${LABEL}] T${j} ltBlock deltas: ${bd.join(', ')} median=${median(bd)}ms`)
	})
} finally {
	ws?.close()
	chrome.kill()
	process.exit(0)
}
