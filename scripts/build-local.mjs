import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'

if (process.env.WORKERS_CI === '1') {
	throw new Error('Local Tina builds must not run in Workers Builds')
}
// Wrangler follows this generated redirect even without an explicit --config.
const redirect = '.wrangler/deploy/config.json'
rmSync(redirect, { force: true })
try {
	const result = spawnSync('pnpm', [
		'exec', 'tinacms', 'build', '--local', '--skip-cloud-checks',
		'-c', 'astro build --outDir dist-local',
	], { stdio: 'inherit' })
	process.exitCode = result.status ?? 1
	if (result.error) throw result.error
} finally {
	rmSync(redirect, { force: true })
}
