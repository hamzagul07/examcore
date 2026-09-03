import {
  isUsablePracticeAnswer,
  stashPracticeAnswer,
  takePracticeAnswer,
  withTotalMarks,
  PRACTICE_ANSWER_KEY,
  MIN_PRACTICE_ANSWER,
  MAX_PRACTICE_ANSWER_CHARS,
} from './practice-answer'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// A minimal sessionStorage, so the one-shot behaviour is testable off a browser.
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v))
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
  get size(): number {
    return this.map.size
  }
}

function withStorage(storage: unknown): void {
  ;(globalThis as { window?: unknown }).window = { sessionStorage: storage }
}

const HREF = '/mark?practice=1&subject=9700&paper=9700%2F23&q=2%28c%29'
const ANSWER =
  'Water is polar because oxygen is more electronegative than hydrogen, so the shared electrons sit closer to the oxygen.'

// ── Only carry an answer worth marking ──────────────────────────────────────
// The floor matches MIN_TYPED_ANSWER in app/mark/page.tsx: below it the marker
// refuses the submission anyway, so there is nothing worth carrying.
check('a real answer is usable', isUsablePracticeAnswer(ANSWER))
check('the floor is 12', MIN_PRACTICE_ANSWER === 12)
check('an answer exactly at the floor is usable', isUsablePracticeAnswer('a'.repeat(12)))
check('one short of the floor is not', !isUsablePracticeAnswer('a'.repeat(11)))
check('whitespace does not count', !isUsablePracticeAnswer('                    '))
check('empty is not usable', !isUsablePracticeAnswer(''))
check('null is not usable', !isUsablePracticeAnswer(null))
check('undefined is not usable', !isUsablePracticeAnswer(undefined))

// ── Round trip ──────────────────────────────────────────────────────────────
{
  const store = new MemoryStorage()
  withStorage(store)
  const href = stashPracticeAnswer(ANSWER, HREF)
  check('the href is returned untouched', href === HREF)
  check('it is stored under the shared key', store.getItem(PRACTICE_ANSWER_KEY) === ANSWER)
  check('it comes back', takePracticeAnswer() === ANSWER)
}

// ── One shot ────────────────────────────────────────────────────────────────
// Reloading /mark, or coming back later, must not refill the box with an
// answer the student has already dealt with.
{
  const store = new MemoryStorage()
  withStorage(store)
  stashPracticeAnswer(ANSWER, HREF)
  takePracticeAnswer()
  check('a second read is empty', takePracticeAnswer() === null)
  check('nothing is left behind', store.size === 0)
}

// ── Nothing stored when there is nothing worth storing ──────────────────────
{
  const store = new MemoryStorage()
  withStorage(store)
  const href = stashPracticeAnswer('no', HREF)
  check('a stub answer stores nothing', store.getItem(PRACTICE_ANSWER_KEY) === null)
  check('and still navigates', href === HREF)
}

// ── Trimming and the length cap ─────────────────────────────────────────────
{
  const store = new MemoryStorage()
  withStorage(store)
  stashPracticeAnswer(`   ${ANSWER}   `, HREF)
  check('surrounding whitespace is dropped', takePracticeAnswer() === ANSWER)

  withStorage(new MemoryStorage())
  stashPracticeAnswer('x'.repeat(MAX_PRACTICE_ANSWER_CHARS + 500), HREF)
  check('over-long answers are capped', takePracticeAnswer()?.length === MAX_PRACTICE_ANSWER_CHARS)
}

// ── A broken store must mean a normal /mark page, never a crash ─────────────
{
  withStorage({
    getItem() {
      throw new Error('private mode')
    },
    setItem() {
      throw new Error('quota exceeded')
    },
    removeItem() {
      throw new Error('private mode')
    },
  })
  let threw = false
  let href = ''
  try {
    href = stashPracticeAnswer(ANSWER, HREF)
    check('a read from a broken store is empty', takePracticeAnswer() === null)
  } catch {
    threw = true
  }
  check('a broken store never throws', !threw)
  check('and the link still works', href === HREF)
}

// ── A junk value is ignored rather than prefilled ───────────────────────────
{
  const store = new MemoryStorage()
  withStorage(store)
  store.setItem(PRACTICE_ANSWER_KEY, '   ')
  check('a whitespace-only stored value reads as empty', takePracticeAnswer() === null)
  check('and is cleared anyway', store.size === 0)
}

// ── Carrying the mark total ─────────────────────────────────────────────────
// "We could not read the total marks" is the commonest recorded mark failure.
// The cache knows this number for every banked question, so on this path the
// marker never has to read it off an image.
check('marks are appended', withTotalMarks(HREF, 6).includes('marks=6'))
check('the existing query survives', withTotalMarks(HREF, 6).includes('practice=1'))
check('the paper reference survives', withTotalMarks(HREF, 6).includes('paper=9700%2F23'))
check('it stays a relative path', withTotalMarks(HREF, 6).startsWith('/mark?'))
check('no origin leaks in', !withTotalMarks(HREF, 6).includes('markscheme.invalid'))
check('a link with no query still works', withTotalMarks('/mark', 6) === '/mark?marks=6')
check('an existing marks value is replaced, not duplicated',
  (withTotalMarks('/mark?marks=3', 9).match(/marks=/g) ?? []).length === 1)
check('and holds the new value', withTotalMarks('/mark?marks=3', 9).includes('marks=9'))

// Out-of-range or absent values are left alone rather than sent and rejected.
check('null marks change nothing', withTotalMarks(HREF, null) === HREF)
check('undefined marks change nothing', withTotalMarks(HREF, undefined) === HREF)
check('zero is not a total', withTotalMarks(HREF, 0) === HREF)
check('negative is not a total', withTotalMarks(HREF, -4) === HREF)
check('above the marker bound is dropped', withTotalMarks(HREF, 101) === HREF)
check('at the marker bound is kept', withTotalMarks(HREF, 100).includes('marks=100'))
check('NaN changes nothing', withTotalMarks(HREF, Number.NaN) === HREF)
check('Infinity changes nothing', withTotalMarks(HREF, Number.POSITIVE_INFINITY) === HREF)
check('a fractional mark is rounded', withTotalMarks(HREF, 5.6).includes('marks=6'))

if (failed > 0) process.exit(1)
console.log('practice-answer.test.ts: all checks passed')
