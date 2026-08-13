/**
 * Pre-derive mark schemes for the IB practice question bank.
 *
 *   pnpm prewarm-derived --dry-run     # show what would be derived, spend nothing
 *   pnpm prewarm-derived               # derive everything uncached
 *   pnpm prewarm-derived --limit=10    # bounded batch
 *   pnpm prewarm-derived --subject=ib-maths-aa-hl
 *
 * Why this exists. `deriving_scheme` is a full Gemini Pro call with thinking,
 * and it sits on the critical path of a mark the student is watching. It only
 * runs when a point-based question has no official scheme — which, for IB, is
 * every single question: mark_schemes holds 3,413 Cambridge rows and zero IB
 * ones. So every IB practice mark pays for a scheme derivation that could have
 * been done offline, once, and shared by every student who attempts it.
 *
 * Distinct from `pnpm prewarm-schemes`, which extracts OFFICIAL Cambridge
 * schemes from PDFs into `mark_schemes`. This fills `derived_mark_schemes`,
 * the cache used when no official scheme exists at all.
 *
 * The cache is keyed by a fingerprint over (question text, total marks, subject,
 * board), so a warmed entry is only reused by a genuinely identical question —
 * this cannot put the wrong rubric in front of anyone.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

const DRY_RUN = process.argv.includes('--dry-run')
const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]?.trim()

const LIMIT = Number(arg('limit')) || Infinity
const SUBJECT = arg('subject') || null
/** Seconds between derivations, so a warm-up never competes with live marking
 * for the same Gemini capacity that the failover exists to route around. */
const PACE_MS = Math.max(0, (Number(arg('pace')) || 3) * 1000)

type PracticeQuestion = {
  id: string
  subject_code: string
  question_text: string
  total_marks: number | null
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { resolveDerivedSchemeForMark } = await import(
    '../lib/marking/resolve-derived-scheme'
  )
  const { resolveMarkingSubjectName } = await import('../lib/marking/subject-name')
  const { isMathSubjectCode } = await import('../lib/marking/math-subjects')

  const service = createServiceClient()

  let q = service
    .from('ib_practice_questions')
    .select('id, subject_code, question_text, total_marks')
    .order('subject_code')
  if (SUBJECT) q = q.eq('subject_code', SUBJECT)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const all = (data ?? []) as PracticeQuestion[]
  // A derivation is only cacheable when the denominator is known: the
  // fingerprint includes total_marks, and without one the resolver derives
  // fresh every time and never writes. Warming those would spend tokens for
  // nothing, so they are reported rather than attempted.
  const usable = all.filter(
    (row) =>
      row.question_text?.trim().length >= 8 &&
      typeof row.total_marks === 'number' &&
      row.total_marks > 0
  )
  const skipped = all.length - usable.length
  const targets = usable.slice(0, LIMIT === Infinity ? undefined : LIMIT)

  console.log(
    `\n${all.length} practice questions${SUBJECT ? ` for ${SUBJECT}` : ''}` +
      ` · ${usable.length} cacheable${skipped ? ` · ${skipped} skipped (no total marks)` : ''}` +
      ` · ${targets.length} in this run${DRY_RUN ? ' (dry run)' : ''}\n`
  )

  if (DRY_RUN) {
    for (const row of targets) {
      console.log(
        `  ${row.subject_code.padEnd(26)} ${String(row.total_marks).padStart(3)}m  ${row.question_text.slice(0, 70).replace(/\s+/g, ' ')}…`
      )
    }
    console.log(`\nWould derive ${targets.length} scheme(s). No tokens spent.\n`)
    return
  }

  let fresh = 0
  let cached = 0
  let failed = 0

  for (const [i, row] of targets.entries()) {
    const subjectName = resolveMarkingSubjectName(row.subject_code)
    try {
      const resolved = await resolveDerivedSchemeForMark({
        questionText: row.question_text,
        totalMarks: row.total_marks,
        subjectName,
        board: 'IB',
        subjectCode: row.subject_code,
        examSystem: 'ib',
        mathConventions:
          isMathSubjectCode(row.subject_code) || /math/i.test(subjectName),
      })
      if (!resolved) {
        failed += 1
        // The id matters: a question that will not derive here will not derive
        // during a live mark either, and the student silently falls back to
        // generic marking. Naming it is the difference between a known bad
        // question and an unexplained failure count.
        console.warn(
          `  ✗ ${row.subject_code} ${row.id} — derivation returned nothing`
        )
      } else if (resolved.source === 'cache') {
        cached += 1
      } else {
        fresh += 1
      }
    } catch (err) {
      failed += 1
      console.warn(
        `  ✗ ${row.subject_code} ${row.id} — ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`
      )
    }

    if ((i + 1) % 10 === 0 || i === targets.length - 1) {
      console.log(
        `  ${i + 1}/${targets.length} — ${fresh} derived, ${cached} already cached, ${failed} failed`
      )
    }
    if (PACE_MS && i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, PACE_MS))
    }
  }

  console.log(
    `\nDone. ${fresh} newly derived, ${cached} already cached, ${failed} failed.` +
      `\nEvery one of those removes a Gemini Pro call from a student's wait.\n`
  )
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
