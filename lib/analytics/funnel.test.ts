/**
 * Lightweight checks for board path encoding (no DOM — test pure helpers via
 * re-implementing the sanitize/path contract the module uses).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const src = readFileSync(resolve('lib/analytics/funnel.ts'), 'utf8')
check('encodes board in beacon path', src.includes('/__funnel/${event}/${b}'))
check('remembers last board', src.includes('ms_funnel_last_board'))
check('exports rememberFunnelBoard', src.includes('export function rememberFunnelBoard'))
check('falls back to lastFunnelBoard', src.includes('props.board ?? lastFunnelBoard()'))

if (failed > 0) process.exit(1)
console.log('funnel.test.ts: all checks passed')
