import { readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = path.join(process.env.LOCALAPPDATA, 'Temp', 'opencode')
const sqlPath = path.join(directory, 'lab-test-historical-phases.sql')
const verifyOnly = process.argv.includes('--verify-only')
const refIndex = process.argv.indexOf('--project-ref')
const projectRef = refIndex < 0 ? 'wnribimpzdoebeqtqxbs' : process.argv[refIndex + 1]
if (!['wnribimpzdoebeqtqxbs', 'fhyurtioqpfmiwdciylt'].includes(projectRef) ||
    (!verifyOnly && projectRef !== 'wnribimpzdoebeqtqxbs')) {
  throw new Error('Production permits --verify-only; migration tests target staging only')
}
const migration = verifyOnly ? '' : await readFile('supabase/migrations/20261019160000_separate_historical_stats_by_phase.sql', 'utf8')
const assertions = await readFile('supabase/test_historical_phases.sql', 'utf8')
await writeFile(sqlPath, `BEGIN;\nSET LOCAL lock_timeout='10s';\n${migration}\n${assertions}\nROLLBACK;\n`)
try {
  const npx = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js')
  const result = spawnSync(process.execPath, [npx, 'supabase', 'db', 'query', '--linked', '--project-ref', projectRef, '--file', sqlPath], { stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  await unlink(sqlPath)
}
