import { appendMarkReturn, buildMarkHref } from './format-session'

let failed = 0
function check(label: string, cond: boolean) {
  if (!cond) {
    failed++
    console.error(`FAIL: ${label}`)
  }
}

const base = buildMarkHref('9709', '9709/12', 's23', '4')

// Adds return + topic to a normal /mark href.
const withReturn = appendMarkReturn(base, '/courses/9709/1-1-quadratics', '1.1')
check('adds return param', withReturn.includes('return=%2Fcourses%2F9709%2F1-1-quadratics'))
check('adds topic param', withReturn.includes('topic=1.1'))
check('preserves existing subject param', withReturn.includes('subject=9709'))

// Does not clobber an existing return.
const preset = appendMarkReturn('/mark?subject=9702&return=%2Fkeep', '/other', '2.2')
check('keeps existing return', preset.includes('return=%2Fkeep') && !preset.includes('%2Fother'))
check('still adds topic when absent', preset.includes('topic=2.2'))

// Handles href with no query string.
const bare = appendMarkReturn('/mark', '/courses/ib-biology-hl/a1-1', 'A1.1')
check('handles bare href', bare.startsWith('/mark?') && bare.includes('topic=A1.1'))

// No return path → unchanged (no dangling ?).
check('null return leaves href untouched', appendMarkReturn(base, null) === base)
check('empty href is a no-op', appendMarkReturn('', '/x') === '')

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}
console.log('format-session: all checks passed')
