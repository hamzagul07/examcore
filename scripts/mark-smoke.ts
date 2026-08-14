/**
 * Run real marks through the real pipeline and check the shape of what returns.
 *
 *   pnpm mark:smoke
 *
 * Everything else that tests marking tests a pure function. This calls
 * `runSingleQuestionMark`, so it exercises what unit tests cannot: which style a
 * question is routed to, whether a scheme is found or derived, whether the
 * verify pass runs, and whether the score that comes back is reconciled against
 * a real denominator.
 *
 * It costs a Gemini Pro call or two per case and takes a couple of minutes,
 * which is why it is a command rather than part of `pnpm test:marking`. Run it
 * after touching anything in the marking path.
 *
 * The first case is a regression. That exact question — a 12-mark "Evaluate the
 * view…" — was marked point_based against twelve derived award points, matched
 * none of them against continuous prose, and scored a competent answer 0/12.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Case = {
  name: string
  questionTextInput: string
  answerText: string
  manualPaperCode: string
  questionMarks: number
  subject: string
  /** What the router must choose. The point of the case. */
  expectStyle: 'point_based' | 'level_of_response' | 'mcq' | 'mixed'
}

const CASES: Case[] = [
  {
    name: 'extended response with no cached scheme is banded, not point-hunted',
    questionTextInput:
      'Evaluate the view that the introduction of a national minimum wage will always reduce employment. [12]',
    answerText:
      'A national minimum wage set above the free-market equilibrium wage creates an excess supply of labour, since quantity supplied exceeds quantity demanded. In a competitive labour market this predicts unemployment, and the size of the effect depends on the elasticity of demand for labour: where demand is inelastic the fall in employment is small. However, in a monopsonistic labour market a minimum wage set between the monopsony wage and the competitive wage can raise both wages and employment, because the firm no longer restricts hiring to hold the wage down. Efficiency wage effects may also raise productivity and offset the cost increase. Overall the claim that it will always reduce employment is too strong: the outcome depends on market structure, elasticity, and the level at which the wage is set.',
    manualPaperCode: '9708/22',
    questionMarks: 12,
    subject: '9708',
    expectStyle: 'level_of_response',
  },
  {
    name: 'short answer stays point-based and awards method marks',
    questionTextInput: 'Solve the equation 3x + 7 = 22. [2]',
    answerText: '3x + 7 = 22 so 3x = 15 therefore x = 5',
    manualPaperCode: '9709/12',
    questionMarks: 2,
    subject: '9709',
    expectStyle: 'point_based',
  },
]

async function main() {
  const { runSingleQuestionMark } = await import(
    '../lib/marking/single-question-pipeline'
  )
  type ProgressEvent = Parameters<
    NonNullable<Parameters<typeof runSingleQuestionMark>[0]['onProgress']>
  >[0]

  let failed = 0
  for (const c of CASES) {
    const startedAt = Date.now()
    const stages: string[] = []
    let provisional: string | null = null

    const result = (await runSingleQuestionMark({
      pageFiles: [],
      answerPdf: null,
      answerText: c.answerText,
      questionPhoto: null,
      questionTextInput: c.questionTextInput,
      manualPaperCode: c.manualPaperCode,
      manualPaperSession: null,
      manualQuestionNumber: null,
      markIntent: 'past_paper',
      fallbackSubjectCode: c.subject,
      questionMarks: c.questionMarks,
      userId: null,
      onProgress: (e: ProgressEvent) => {
        if (e.type === 'progress') stages.push(e.stage)
        if (e.type === 'provisional_score') {
          provisional = `${e.marks_earned}/${e.total_marks}`
        }
      },
      // The pipeline input carries many optional fields this probe does not
      // set; the cast keeps the call site readable without widening the type.
    } as Parameters<typeof runSingleQuestionMark>[0])) as Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >

    const seconds = Math.round((Date.now() - startedAt) / 1000)
    const style = result.ai_marking?.marking_style
    const earned = result.marks_earned
    const total = result.total_marks

    console.log(`\n${c.name}`)
    console.log(`  ${seconds}s · ${[...new Set(stages)].join(' → ')}`)
    console.log(
      `  ${earned}/${total} · style ${style}` +
        (provisional ? ` · first read ${provisional}` : ' · no provisional score')
    )

    const problems: string[] = []
    if (style !== c.expectStyle) problems.push(`style ${style}, expected ${c.expectStyle}`)
    // A mark out of the wrong denominator is worse than a wrong mark, because it
    // looks right on the page.
    if (total !== c.questionMarks) problems.push(`total ${total}, expected ${c.questionMarks}`)
    if (typeof earned !== 'number' || earned < 0 || earned > total) {
      problems.push(`earned ${earned} is outside 0..${total}`)
    }
    if (!String(result.ai_marking?.summary ?? '').trim()) problems.push('no summary')
    // The evidence a student is shown: a band placement for an essay, awarded
    // points for a structured answer. A score with neither is unexplainable.
    const hasEvidence =
      !!result.ai_marking?.band_result ||
      (result.ai_marking?.marks_awarded?.length ?? 0) > 0 ||
      (result.ai_marking?.criteria_results?.length ?? 0) > 0
    if (!hasEvidence) problems.push('score has no band or awarded marks behind it')

    if (problems.length) {
      failed++
      for (const p of problems) console.error(`  FAIL ${p}`)
    } else {
      console.log('  ok')
    }
  }

  console.log('')
  if (failed) {
    console.error(`${failed} case(s) failed.`)
    process.exitCode = 1
  } else {
    console.log(`mark-smoke: ${CASES.length} case(s) passed.`)
  }
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
