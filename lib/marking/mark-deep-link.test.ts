import assert from 'node:assert/strict'
import { withTotalMarks } from './practice-answer'
import {
  MARK_DEEP_LINK,
  MARK_DEEP_LINK_MAX_MARKS,
  deepLinkQuestion,
  isPracticeDeepLink,
} from './mark-deep-link'

/**
 * The contract between the pages that offer an answer box and /mark.
 *
 * The parameter names live in `mark-deep-link.ts`, which the /mark effects
 * read through. This asserts the real cached link data satisfies the shapes
 * those effects actually read — so renaming a parameter on either side fails
 * here rather than dropping a student's typed answer in production.
 */

const PRACTICE_FLAG = MARK_DEEP_LINK.practiceFlag
const PAPER = MARK_DEEP_LINK.paper
const QUESTION_KEYS = MARK_DEEP_LINK.questionKeys
const SUBJECT = MARK_DEEP_LINK.subject
const TOPIC = MARK_DEEP_LINK.topic
const MARKS = MARK_DEEP_LINK.marks
/** parseTotalMarksInput's bound, which the marks field on /mark enforces. */
const MAX_MARKS = MARK_DEEP_LINK_MAX_MARKS

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
      assert.ok(isPracticeDeepLink(sp), `missing practice=1: ${q.markHref}`)
      assert.equal(sp.get(PRACTICE_FLAG), '1')
      assert.ok(sp.get(PAPER), `missing paper reference: ${q.markHref}`)
      assert.ok(deepLinkQuestion(sp), `missing question number: ${q.markHref}`)
      assert.ok(QUESTION_KEYS.some((k) => sp.get(k)))

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
      assert.ok(
        !isPracticeDeepLink(sp),
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
