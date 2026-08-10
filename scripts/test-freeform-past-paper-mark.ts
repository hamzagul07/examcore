/**
 * Live integration test: mark a REAL past-paper question as freeform
 * (no mark_scheme_id), with a locked total, twice — proving derive-cache
 * remake stability.
 *
 * Uses 9709/21 May/June 2025 Q2(a) [2] from mark_schemes, but marks it on
 * the freeform path (as if the student pasted the question without picking
 * the paper).
 *
 * Run: npx tsx scripts/test-freeform-past-paper-mark.ts
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { markSingleQuestion } from '../lib/marking/mark-runner'
import { lookupDerivedScheme } from '../lib/marking/derived-scheme-cache'
import { schemeFingerprint } from '../lib/marking/scheme-fingerprint'
import { markingBoardLabel } from '../lib/marking/exam-board'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (process.env[k] === undefined) process.env[k] = v
}

const PAPER = {
  paper_code: '9709/21',
  paper_session: 'May/June 2025',
  question_number: '2(a)',
}

/** Clean stem — DB OCR had "4*" for 4^x. */
const CLEAN_QUESTION = `(a) Use logarithms to solve the inequality 4^x < 0.05. Give your answer in the form x < a, where the value of a is correct to 3 significant figures.
[2]`

/** Correct working for the official M1+A1 scheme. */
const STUDENT_ANSWER = `4^x < 0.05
Take ln of both sides:
x ln 4 < ln 0.05
x < ln 0.05 / ln 4
x < -2.16 (3 s.f.)`

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: banked, error } = await sb
    .from('mark_schemes')
    .select('id, total_marks, question_text, mark_scheme')
    .eq('paper_code', PAPER.paper_code)
    .eq('paper_session', PAPER.paper_session)
    .eq('question_number', PAPER.question_number)
    .maybeSingle()
  if (error || !banked) {
    throw new Error(`Could not load banked question: ${error?.message}`)
  }

  const totalMarks = banked.total_marks as number
  console.log('Banked paper', {
    ...PAPER,
    totalMarks,
    bankedId: banked.id,
  })

  const board = markingBoardLabel('9709', {})
  const fingerprint = schemeFingerprint({
    questionText: CLEAN_QUESTION,
    totalMarks,
    subjectCode: '9709',
    board,
  })
  console.log('fingerprint', fingerprint.slice(0, 20) + '…')

  const stages1: string[] = []
  const first = await markSingleQuestion({
    ocrText: STUDENT_ANSWER,
    ocrLines: [],
    questionText: CLEAN_QUESTION,
    markScheme: null, // freeform — ignore banked scheme
    markingMode: 'general_criteria_practice',
    fallbackSubjectCode: '9709',
    questionTotalMarks: totalMarks,
    verify: true,
    rewrite: false,
    onStage: (s) => stages1.push(s),
  })

  const firstScore = `${first.markingResult.marks_earned}/${first.markingResult.total_marks}`
  const firstSource = first.markingResult.derived_scheme_source
  const firstFp = first.markingResult.derived_scheme_fingerprint
  console.log('Run 1', {
    score: firstScore,
    source: firstSource,
    fingerprint: typeof firstFp === 'string' ? firstFp.slice(0, 20) + '…' : firstFp,
    stages: stages1,
    summary: String(first.markingResult.summary || '').slice(0, 180),
  })

  if (Number(first.markingResult.total_marks) !== totalMarks) {
    throw new Error(
      `Denominator not locked: got ${first.markingResult.total_marks}, expected ${totalMarks}`
    )
  }

  // Cache should now hold the rubric (table or storage).
  const cached = await lookupDerivedScheme(fingerprint)
  console.log('Cache after run 1', cached ? 'HIT ready' : 'MISS (unstable derive or write failed)')

  const stages2: string[] = []
  const second = await markSingleQuestion({
    ocrText: STUDENT_ANSWER,
    ocrLines: [],
    questionText: CLEAN_QUESTION,
    markScheme: null,
    markingMode: 'general_criteria_practice',
    fallbackSubjectCode: '9709',
    questionTotalMarks: totalMarks,
    verify: true,
    rewrite: false,
    onStage: (s) => stages2.push(s),
  })

  const secondScore = `${second.markingResult.marks_earned}/${second.markingResult.total_marks}`
  const secondSource = second.markingResult.derived_scheme_source
  console.log('Run 2', {
    score: secondScore,
    source: secondSource,
    stages: stages2,
    summary: String(second.markingResult.summary || '').slice(0, 180),
  })

  if (Number(second.markingResult.total_marks) !== totalMarks) {
    throw new Error(
      `Run 2 denominator drift: got ${second.markingResult.total_marks}`
    )
  }

  if (firstSource !== 'fresh' && firstSource !== 'cache') {
    throw new Error(
      `Run 1 did not produce a derived scheme (source=${String(firstSource)}). Derive/cache path broken.`
    )
  }

  // Remake must reuse cache when the first write succeeded.
  if (secondSource !== 'cache') {
    throw new Error(
      `Expected cache hit on remake, got derived_scheme_source=${String(secondSource)}`
    )
  }

  // Same answer + same rubric → same score.
  if (
    Number(first.markingResult.marks_earned) !==
    Number(second.markingResult.marks_earned)
  ) {
    throw new Error(
      `Score flipped on remake with cached rubric: ${firstScore} → ${secondScore}`
    )
  }

  // Probe SQL table status
  const { error: tableErr } = await sb
    .from('derived_mark_schemes')
    .select('fingerprint')
    .limit(1)
  console.log(
    tableErr
      ? `SQL table: not applied (${tableErr.message.slice(0, 60)}) — storage fallback in use`
      : 'SQL table: live'
  )

  console.log('PASS — freeform past-paper mark stable', {
    paper: `${PAPER.paper_code} ${PAPER.paper_session} Q${PAPER.question_number}`,
    scores: [firstScore, secondScore],
    sources: [firstSource, secondSource],
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
