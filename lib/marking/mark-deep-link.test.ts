import assert from 'node:assert/strict'
import { withTotalMarks } from './practice-answer'

/**
 * The contract between the pages that offer an answer box and /mark.
 *
 * Three page families now put a textarea in front of a student and send what
 * they write to /mark:
 *
 *   /past-papers/[code]/[topic]        →  /mark?practice=1&paper=…&q=…
 *   /ib/past-papers/[slug]/[topic]     →  /mark?subject=…&topic=…
 *   /ib/past-papers/[slug]             →  /mark?subject=…
 *
 * Each lands on a DIFFERENT branch of /mark, selected purely by which query
 * parameters are present. Nothing in the type system connects the two sides, so
 * renaming a parameter on either side would leave the student staring at a
 * blank marker with the answer they just typed silently dropped — and every
 * page would still build, typecheck and render.
 *
 * This asserts the real cached data satisfies the shapes /mark actually reads.
 */

// The parameter names read by the deep-link effects in app/mark/page.tsx.
// Change one there and this list has to change with it — which is the point.
const PRACTICE_FLAG = 'practice'
const PAPER = 'paper'
const QUESTION_KEYS = ['q', 'question'] as const
const SUBJECT = 'subject'
const TOPIC = 'topic'
const MARKS = 'marks'
/** parsedTotalMarksInput's bound in app/mark/page.tsx. */
const MAX_MARKS = 100

function params(href: string): URLSearchParams {
  assert.ok(href.startsWith('/mark'), `deep link must target /mark: ${href}`)
  return new URL(href, 'https://markscheme.invalid').searchParams
}

async function main() {
  const { getAllExpandedTopicQuestionParams, getExpandedTopicQuestionPage } =
    await import('@/lib/seo/topic-questions-expand')

  // ── Cambridge topic questions ─────────────────────────────────────────────
  let questions = 0
  let carriedTotals = 0

  for (const { code, topic } of getAllExpandedTopicQuestionParams()) {
    const page = getExpandedTopicQuestionPage(code, topic)
    if (!page) continue

    for (const q of page.questions) {
      questions++
      const sp = params(q.markHref)

      // The practice branch is selected by this flag alone. Without it /mark
      // falls through to the subject/topic branch, which cannot resolve a
      // paper reference and shows an empty picker.
      assert.equal(
        sp.get(PRACTICE_FLAG),
        '1',
        `missing practice=1: ${q.markHref}`
      )
      assert.ok(sp.get(PAPER), `missing paper reference: ${q.markHref}`)
      assert.ok(
        QUESTION_KEYS.some((k) => sp.get(k)),
        `missing question number: ${q.markHref}`
      )

      // The whole point of carrying the total: "we could not read the total
      // marks" is the commonest recorded mark failure, and it fires only after
      // the student has waited. A banked question whose total is outside the
      // marker's bound would be dropped by withTotalMarks and reintroduce it.
      const marks = q.marks
      assert.ok(
        typeof marks === 'number',
        `no mark total banked for ${q.paperCode} Q${q.questionNumber}`
      )
      assert.ok(
        marks > 0 && marks <= MAX_MARKS,
        `mark total ${marks} is outside what /mark accepts (${q.paperCode} Q${q.questionNumber})`
      )

      const withMarks = params(withTotalMarks(q.markHref, marks))
      assert.equal(withMarks.get(MARKS), String(marks))
      // Everything the practice branch needs must survive the rewrite.
      assert.equal(withMarks.get(PRACTICE_FLAG), '1')
      assert.equal(withMarks.get(PAPER), sp.get(PAPER))
      for (const k of QUESTION_KEYS) {
        assert.equal(withMarks.get(k), sp.get(k), `lost ${k}: ${q.markHref}`)
      }
      carriedTotals++
    }
  }

  assert.ok(questions > 0, 'no banked topic questions found — the fixture is empty')
  assert.equal(
    carriedTotals,
    questions,
    'every banked question must be able to carry its total'
  )

  // ── IB topic pages ────────────────────────────────────────────────────────
  const { getIbTopicPracticeSubjectSlugs, getIbTopicPracticePages } =
    await import('@/lib/seo/ib-topic-practice')

  let ibPages = 0
  for (const slug of getIbTopicPracticeSubjectSlugs()) {
    for (const page of getIbTopicPracticePages(slug)) {
      ibPages++
      const sp = params(page.markHref)
      assert.ok(sp.get(SUBJECT), `IB topic link has no subject: ${page.markHref}`)
      assert.ok(sp.get(TOPIC), `IB topic link has no topic: ${page.markHref}`)
      // practice=1 would route it to the past-paper branch, which needs a
      // paper reference this link does not have.
      assert.notEqual(
        sp.get(PRACTICE_FLAG),
        '1',
        `IB topic link must not claim the practice branch: ${page.markHref}`
      )
    }
  }
  assert.ok(ibPages > 0, 'no IB topic practice pages found — the fixture is empty')

  // ── IB subject pages ──────────────────────────────────────────────────────
  // Built inline by app/(marketing)/(chrome)/ib/past-papers/[slug]/page.tsx:
  // the level suffix is stripped because IB marking codes are level-independent.
  const subjectHref = `/mark?subject=ib-${'chemistry-hl'.replace(/-(hl|sl)$/i, '')}`
  const subjectSp = params(subjectHref)
  assert.equal(subjectSp.get(SUBJECT), 'ib-chemistry')
  assert.equal(subjectSp.get(TOPIC), null, 'no topic — /mark resolves the subject alone')
  assert.notEqual(subjectSp.get(PRACTICE_FLAG), '1')

  console.log(
    `mark-deep-link: ${questions} Cambridge questions, ${ibPages} IB topics, all shapes valid`
  )
}

void main()
