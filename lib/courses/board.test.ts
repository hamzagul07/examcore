import fs from 'node:fs'
import {
  resolveBoard,
  isIbSubjectCode,
  boardLabel,
  contentSubjectCode,
  catalogSubjectSlug,
  subjectLevel,
} from './board'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── The rule the whole module rests on, checked against real content ────────
// Cambridge codes are numeric and IB slugs are not. If a non-numeric Cambridge
// subject is ever added, resolveBoard would call it IB and every board-derived
// string in the product would flip. Fail loudly here rather than in production.
const dirs = fs.readdirSync('content/courses').filter((d) => !d.startsWith('.'))
const cambridgeDirs = dirs.filter((d) => !d.startsWith('ib-'))
const ibDirs = dirs.filter((d) => d.startsWith('ib-'))

check('there are subjects of both boards', cambridgeDirs.length > 0 && ibDirs.length > 0)
check('every Cambridge code is numeric', cambridgeDirs.every((d) => /^\d+$/.test(d)))
check('no IB catalog slug is numeric', ibDirs.every((d) => !/^\d+$/.test(d.slice(3))))

// Every real subject resolves correctly in BOTH shapes, with no hint.
for (const d of cambridgeDirs) {
  if (resolveBoard(d) !== 'cambridge') {
    failed++
    console.error(`FAIL ${d} should resolve to cambridge`)
  }
}
for (const d of ibDirs) {
  const slug = d.slice(3)
  if (resolveBoard(d) !== 'ib' || resolveBoard(slug) !== 'ib') {
    failed++
    console.error(`FAIL ${d} should resolve to ib in both shapes`)
  }
}
check('all real subjects resolve in both shapes', true)

// ── The specific bugs this replaces ─────────────────────────────────────────

// The canonical IB route passes an unprefixed slug. A startsWith('ib-') test
// called it Cambridge — the root cause of every board bug found so far.
check('unprefixed IB slug is IB', resolveBoard('biology-hl') === 'ib')
check('prefixed IB code is IB', resolveBoard('ib-biology-hl') === 'ib')
check('both shapes agree', resolveBoard('biology-hl') === resolveBoard('ib-biology-hl'))
check('numeric code is Cambridge', resolveBoard('9702') === 'cambridge')

// Core subjects have no level suffix and must not trip the rule.
check('tok is IB', resolveBoard('tok') === 'ib')
check('extended-essay is IB', resolveBoard('extended-essay') === 'ib')
check('cas is IB', resolveBoard('cas') === 'ib')

check('explicit board wins', resolveBoard('9702', 'ib') === 'ib')
check('whitespace tolerated', resolveBoard('  9702  ') === 'cambridge')

check('isIbSubjectCode agrees', isIbSubjectCode('biology-hl') && !isIbSubjectCode('9702'))

// ── Labels ──────────────────────────────────────────────────────────────────
// Cambridge keeps its code because "9702" is what students search; IB drops the
// slug because an internal directory name says nothing to a reader.
check('Cambridge label keeps the code', boardLabel('9702') === 'Cambridge 9702')
check('IB label is the board', boardLabel('biology-hl') === 'IB Diploma')
check('IB label never says Cambridge', !/Cambridge/.test(boardLabel('ib-biology-hl')))
check('IB label never leaks the slug', !boardLabel('biology-hl').includes('biology-hl'))

// ── Code shapes ─────────────────────────────────────────────────────────────
check('content code prefixes IB', contentSubjectCode('biology-hl') === 'ib-biology-hl')
check('content code is idempotent', contentSubjectCode('ib-biology-hl') === 'ib-biology-hl')
check('content code leaves Cambridge alone', contentSubjectCode('9702') === '9702')

check('catalog slug strips the prefix', catalogSubjectSlug('ib-biology-hl') === 'biology-hl')
check('catalog slug is idempotent', catalogSubjectSlug('biology-hl') === 'biology-hl')
check('catalog slug leaves Cambridge alone', catalogSubjectSlug('9702') === '9702')

// Round-trips both ways for every real IB subject.
for (const d of ibDirs) {
  if (contentSubjectCode(catalogSubjectSlug(d)) !== d) {
    failed++
    console.error(`FAIL round-trip broke for ${d}`)
  }
}
check('content <-> catalog round-trips', true)

// ── Level ───────────────────────────────────────────────────────────────────
check('HL detected', subjectLevel('biology-hl') === 'HL')
check('SL detected', subjectLevel('biology-sl') === 'SL')
check('prefixed HL detected', subjectLevel('ib-maths-aa-hl') === 'HL')
// "-hl" must only count as a suffix — a subject merely containing those letters
// is not Higher Level.
check('mid-word hl is not a level', subjectLevel('ib-global-politics-sl') === 'SL')

if (failed > 0) process.exit(1)
console.log(
  `board.test.ts: all checks passed (${cambridgeDirs.length} Cambridge, ${ibDirs.length} IB subjects)`
)
