/**
 * /mark board lock: signed-in students mark on their profile board and never
 * see the six-board grid; guests still pick; deep links still override.
 *
 * AP marking is switched off through the env before the registry loads so
 * the "board not live for marking" branch is exercised for real.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

process.env.NEXT_PUBLIC_AP_MARKING_ENABLED = '0'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// tsx runs this as CJS (no top-level await) — the env above must land before
// the registry module evaluates its markingEnabled flags, hence dynamic imports.
async function main() {
  const { resolveMarkBoardLock } = await import('@/lib/marking/mark-board-lock')
  const hint = await import('@/lib/marking/mark-board-hint')

  // ── resolveMarkBoardLock ────────────────────────────────────────────────────

  const guest = resolveMarkBoardLock({ profileBoard: null, selectedBoard: 'cambridge' })
  check('guest keeps the picker', guest.mode === 'picker')

  const blank = resolveMarkBoardLock({ profileBoard: '   ', selectedBoard: 'cambridge' })
  check('blank profile board keeps the picker', blank.mode === 'picker')

  const unknown = resolveMarkBoardLock({ profileBoard: 'Hogwarts', selectedBoard: 'cambridge' })
  check('unknown profile board keeps the picker', unknown.mode === 'picker')

  const apOff = resolveMarkBoardLock({ profileBoard: 'AP', selectedBoard: 'cambridge' })
  check('profile board without a live marking pack keeps the picker', apOff.mode === 'picker')

  const caie = resolveMarkBoardLock({
    profileBoard: 'Cambridge International',
    selectedBoard: 'cambridge',
  })
  check('Cambridge profile locks to cambridge', caie.mode === 'locked' && caie.board === 'cambridge')
  check(
    'Cambridge profile is not overridden on its own board',
    caie.mode === 'locked' && caie.profileBoard === 'cambridge' && !caie.overridden
  )

  const ibProfile = resolveMarkBoardLock({ profileBoard: 'IB', selectedBoard: 'ib' })
  check('IB profile locks to ib', ibProfile.mode === 'locked' && ibProfile.board === 'ib')

  const deepLink = resolveMarkBoardLock({
    profileBoard: 'Cambridge International',
    selectedBoard: 'ib',
  })
  check(
    'deep link to another board is reported as an override, not a picker',
    deepLink.mode === 'locked' &&
      deepLink.board === 'ib' &&
      deepLink.profileBoard === 'cambridge' &&
      deepLink.overridden
  )

  const deepLinkOff = resolveMarkBoardLock({
    profileBoard: 'Cambridge International',
    selectedBoard: 'ap',
  })
  check(
    'deep link to a board that is not live falls back to the profile board',
    deepLinkOff.mode === 'locked' && deepLinkOff.board === 'cambridge' && !deepLinkOff.overridden
  )

  const teacher = resolveMarkBoardLock({
    profileBoard: 'Cambridge International',
    selectedBoard: 'cambridge',
    role: 'teacher',
  })
  check('teachers keep the grid', teacher.mode === 'picker')
  const student = resolveMarkBoardLock({
    profileBoard: 'Cambridge International',
    selectedBoard: 'cambridge',
    role: 'student',
  })
  check('students are locked', student.mode === 'locked')

  const padded = resolveMarkBoardLock({ profileBoard: ' Edexcel ', selectedBoard: 'edexcel' })
  check('profile board is trimmed before lookup', padded.mode === 'locked' && padded.board === 'edexcel')

  // ── mark-board-hint (pure helpers against a tiny fake window) ───────────────

  check('boot script reads the same key it writes', hint.MARK_BOARD_HINT_BOOT_SCRIPT.includes(hint.MARK_BOARD_HINT_KEY))
  check('boot script sets the same attribute the CSS keys on', hint.MARK_BOARD_HINT_BOOT_SCRIPT.includes(hint.MARK_BOARD_HINT_ATTR))
  check('boot script is wrapped in try/catch', hint.MARK_BOARD_HINT_BOOT_SCRIPT.startsWith('(function(){try{'))

  check('read is null without a window', hint.readMarkBoardHint() === null)

  const store = new Map<string, string>()
  const attrs = new Map<string, string>()
  let events = 0
  const fakeWindow = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {
      events++
      return true
    },
  }
  const fakeDocument = {
    documentElement: {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
    },
  }
  const g = globalThis as unknown as { window?: unknown; document?: unknown; Event?: unknown }
  g.window = fakeWindow
  g.document = fakeDocument
  g.Event = class {
    constructor(public type: string) {}
  }

  hint.writeMarkBoardHint('Cambridge International')
  check('write stores the profile board', store.get(hint.MARK_BOARD_HINT_KEY) === 'Cambridge International')
  check('write stamps the html attribute', attrs.get(hint.MARK_BOARD_HINT_ATTR) === '1')
  check('write notifies subscribers', events === 1)
  check('read returns the stored board', hint.readMarkBoardHint() === 'Cambridge International')

  hint.writeMarkBoardHint('  ')
  check('blank write clears the hint', !store.has(hint.MARK_BOARD_HINT_KEY))
  check('blank write removes the html attribute', !attrs.has(hint.MARK_BOARD_HINT_ATTR))

  hint.writeMarkBoardHint('IB')
  hint.clearMarkBoardHint()
  check('clear removes the stored board', hint.readMarkBoardHint() === null)
  check('clear removes the html attribute', !attrs.has(hint.MARK_BOARD_HINT_ATTR))

  delete g.window
  delete g.document
  delete g.Event

  // ── wiring contracts (both /mark render sites + the boot script) ────────────

  const page = readFileSync(resolve('app/mark/page.tsx'), 'utf8')
  check('legacy /mark passes the lock to the picker', /<MarkBoardPicker[\s\S]*?lock=\{boardLock\}/.test(page))
  check('legacy /mark passes the lock into MarkFlow', /<MarkFlow[\s\S]*?boardLock=\{boardLock\}/.test(page))
  check('/mark writes the hint from the loaded profile', page.includes('writeMarkBoardHint('))
  check('/mark clears the hint for guests', page.includes('clearMarkBoardHint()'))

  const capture = readFileSync(resolve('components/mark-flow/screens/CaptureScreen.tsx'), 'utf8')
  check('MarkFlow capture passes the lock to the picker', /<MarkBoardPicker[\s\S]*?lock=\{boardLock\}/.test(capture))

  const layout = readFileSync(resolve('app/layout.tsx'), 'utf8')
  check('root layout inlines the board-hint boot script', layout.includes('MARK_BOARD_HINT_BOOT_SCRIPT'))

  const css = readFileSync(resolve('lib/design-system/mark-page.css'), 'utf8')
  check('mark-page.css hides the grid behind the boot attribute', css.includes(`html[${hint.MARK_BOARD_HINT_ATTR}]`))

  if (failed > 0) process.exit(1)
  console.log('mark-board-lock.test.ts: all checks passed')
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
