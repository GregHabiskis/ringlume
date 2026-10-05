// Attribute main-thread long tasks in a Chrome trace (LH or CDP format).
// Usage: node trace-analyze.mjs <trace.json> [minTaskMs]
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const MIN_US = Number(process.argv[3] || 50) * 1000
const raw = JSON.parse(readFileSync(file, 'utf8'))
const events = Array.isArray(raw) ? raw : raw.traceEvents || raw

// find renderer main thread: the thread with the most Layout/Paint duration
const scores = new Map()
for (const e of events) {
	if (!e.dur) continue
	if (['Layout', 'UpdateLayoutTree', 'Paint', 'EvaluateScript', 'ParseHTML'].includes(e.name)) {
		const k = `${e.pid}:${e.tid}`
		scores.set(k, (scores.get(k) || 0) + e.dur)
	}
}
const [mainPid, mainTid] = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0].split(':').map(Number)
const main = events
	.filter((e) => e.pid === mainPid && e.tid === mainTid && e.dur > 0)
	.sort((a, b) => a.ts - b.ts)

const tasks = main.filter((e) => (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && e.dur >= MIN_US)
console.log(`main thread ${mainPid}:${mainTid}; tasks >= ${MIN_US / 1000}ms: ${tasks.length}`)

const ms = (us) => (us / 1000).toFixed(0)

for (const t of tasks.sort((a, b) => b.ts - a.ts)) {
	const end = t.ts + t.dur
	// direct children only: walk the sorted list with a containment stack
	const stack = [t]
	const direct = []
	for (const e of main) {
		if (e === t || e.ts < t.ts || e.ts >= end) continue
		while (stack.length > 1 && e.ts >= stack[stack.length - 1].ts + stack[stack.length - 1].dur) stack.pop()
		if (e.ts >= stack[stack.length - 1].ts && e.ts + e.dur <= stack[stack.length - 1].ts + stack[stack.length - 1].dur) {
			if (stack.length === 1) direct.push(e)
			stack.push(e)
		}
	}
	const agg = new Map()
	for (const c of direct) agg.set(c.name, (agg.get(c.name) || 0) + c.dur)
	const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
	console.log(`\nTask ${ms(t.dur)}ms @${ms(t.ts - main[0].ts)}ms`)
	for (const [n, d] of top) {
		console.log(`   ${ms(d)}ms  ${n}`)
		// detail for script/layout-bearing children
		for (const c of direct) {
			if (c.name !== n) continue
			const a = c.args && c.args.data
			if (!a) continue
			const label = [a.functionName, a.url, a.type].filter(Boolean).join(' | ')
			if (label) console.log(`        ${ms(c.dur)}ms  ${label.slice(0, 150)}`)
		}
	}
}

const agg = new Map()
for (const e of main) if (e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask') agg.set(e.name, (agg.get(e.name) || 0) + e.dur)
console.log('\nmain-thread totals by event (ms), whole trace:')
for (const [n, d] of [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`   ${ms(d)}ms  ${n}`)
