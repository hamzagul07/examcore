import {
  resumeState,
  resumeMessage,
  MIN_SECTIONS_TO_RESUME,
  type TocEntry,
} from './lesson-resume'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const toc: TocEntry[] = [
  { id: 'simple', label: 'Simple explanation' },
  { id: 'visual', label: 'Visual learning' },
  { id: 'notes', label: 'Full notes' },
  { id: 'quiz', label: 'Quick check' },
]
const seen = (...ids: string[]) => new Set(ids)

// ── Silence when there is nothing to resume ─────────────────────────────────
// "1 of 12 done" the moment somebody glances at a page is noise dressed as
// encouragement.
check('first visit says nothing', resumeState(toc, seen()).kind === 'none')
check('one section says nothing', resumeState(toc, seen('simple')).kind === 'none')
check(
  'threshold is where it says it is',
  resumeState(toc, seen('simple', 'visual')).kind !== 'none' && MIN_SECTIONS_TO_RESUME === 2
)
check('no sections at all says nothing', resumeState([], seen('a', 'b')).kind === 'none')

// ── Partway through ─────────────────────────────────────────────────────────
const partway = resumeState(toc, seen('simple', 'visual'))
check('partway continues', partway.kind === 'continue')
if (partway.kind === 'continue') {
  check('counts what is done', partway.done === 2 && partway.total === 4)
  // Must point at the first UNREAD section in page order, not the next one
  // along from whatever was read last.
  check('points at the first gap', partway.nextId === 'notes')
  check('carries a human label', partway.nextLabel === 'Full notes')
}

// Sections read out of order still resolve to the earliest gap.
const skipped = resumeState(toc, seen('simple', 'notes', 'quiz'))
check(
  'out-of-order reading finds the earliest gap',
  skipped.kind === 'continue' && skipped.nextId === 'visual'
)

// ── Retrieval next (quiz / teach-back / cards) ──────────────────────────────
const toRetrieval = resumeState(toc, seen('simple', 'visual', 'notes'), {
  retrievalIds: ['quiz', 'teachback', 'cards'],
})
check('next retrieval is check kind', toRetrieval.kind === 'check')
check(
  'check points at quiz',
  toRetrieval.kind === 'check' && toRetrieval.checkId === 'quiz'
)

const withTeach = [
  ...toc.slice(0, 3),
  { id: 'teachback', label: 'Teach it back' },
]
const toTeach = resumeState(withTeach, seen('simple', 'visual', 'notes'), {
  retrievalIds: ['quiz', 'teachback', 'cards'],
})
check(
  'teach-back surfaces when quiz absent',
  toTeach.kind === 'check' && toTeach.checkId === 'teachback'
)

// Priority order beats TOC order once reading before retrieval is done.
const messyToc: TocEntry[] = [
  { id: 'simple', label: 'Simple explanation' },
  { id: 'notes', label: 'Full notes' },
  { id: 'cards', label: 'Flashcards' },
  { id: 'teachback', label: 'Teach it back' },
  { id: 'quiz', label: 'Quick check' },
]
const priority = resumeState(messyToc, seen('simple', 'notes'), {
  retrievalIds: ['quiz', 'teachback', 'cards'],
})
check(
  'retrieval priority prefers quiz over earlier cards',
  priority.kind === 'check' && priority.checkId === 'quiz'
)
const afterQuiz = resumeState(messyToc, seen('simple', 'notes', 'quiz'), {
  retrievalIds: ['quiz', 'teachback', 'cards'],
})
check(
  'after quiz prefers teach-back over earlier cards',
  afterQuiz.kind === 'check' && afterQuiz.checkId === 'teachback'
)

// ── Everything read ─────────────────────────────────────────────────────────
const all = seen('simple', 'visual', 'notes', 'quiz')

// Rereading is the weakest way to revise, so an unfinished quick check is a
// better thing to point at than the top of the page.
const unchecked = resumeState(toc, all, { checkId: 'quiz', checkDone: false })
check('unfinished check is surfaced', unchecked.kind === 'check')
check('check carries its anchor', unchecked.kind === 'check' && unchecked.checkId === 'quiz')

check(
  'finished check completes',
  resumeState(toc, all, { checkId: 'quiz', checkDone: true }).kind === 'complete'
)
// A lesson with no quick check cannot be nagged about one.
check('no check means complete', resumeState(toc, all).kind === 'complete')

// ── Copy ────────────────────────────────────────────────────────────────────
const msg = resumeMessage(partway)
check('continue names the section', !!msg && msg.body.includes('Full notes'))
check('continue counts honestly', !!msg && msg.body.includes('2 of 4'))
check('none has no message', resumeMessage({ kind: 'none' }) === null)
check('check has a message', !!resumeMessage({ kind: 'check', total: 4, checkId: 'quiz' }))
check(
  'teach-back copy',
  !!resumeMessage({ kind: 'check', total: 4, checkId: 'teachback' })?.body.includes(
    'Teach the topic'
  )
)
check('complete has a message', !!resumeMessage({ kind: 'complete', total: 4 }))

if (failed > 0) process.exit(1)
console.log('lesson-resume.test.ts: all checks passed')
