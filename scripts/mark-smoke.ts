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
 *
 *   pnpm mark:smoke --full
 *
 * adds the discrimination sets, which are the ones that test judgement rather
 * than plumbing: the same question answered well, adequately and badly, checked
 * for whether the marks separate. Shape assertions cannot catch a marker that
 * awards everyone eleven out of twelve. Slower and costs more, so opt-in.
 *
 * Expect the point-based set to fail occasionally, and read it as a finding
 * rather than as flakiness to tune away. The answer "a = 4, b = 7, c = 9" has
 * exactly one correct component against a scheme that awards B1 for it, and has
 * been observed scoring both 1/3 and 0/3 on separate runs of identical input.
 * A marker that sometimes drops a mark the scheme plainly awards is the thing
 * worth knowing about; widening the expected range would hide it.
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

type Discrimination = {
  name: string
  questionTextInput: string
  manualPaperCode: string
  questionMarks: number
  subject: string
  /** Answers in descending quality, each with the mark range it should land in. */
  answers: { label: string; answer: string; min: number; max: number }[]
}

const DISCRIMINATION: Discrimination[] = [
  {
    name: 'point-based against a cached official scheme',
    questionTextInput:
      'The diagram shows the curve with equation y = a sin(bx)+c for 0 ≤ x ≤ 2π, where a, b and c are positive constants. State the values of a, b and c.',
    manualPaperCode: '9709/12',
    questionMarks: 3,
    subject: '9709',
    // One B1 each for a=4, b=2, c=3. Exact, so the expected mark is exact too.
    answers: [
      { label: 'all three correct', answer: 'a = 4, b = 2, c = 3', min: 3, max: 3 },
      { label: 'two correct', answer: 'a = 4, b = 2, c = 5', min: 2, max: 2 },
      { label: 'one correct', answer: 'a = 4, b = 7, c = 9', min: 1, max: 1 },
      { label: 'none correct', answer: 'a = 1, b = 1, c = 1', min: 0, max: 0 },
    ],
  },
  {
    name: 'band judgement on an extended response',
    questionTextInput:
      'Evaluate the view that the introduction of a national minimum wage will always reduce employment. [12]',
    manualPaperCode: '9708/22',
    questionMarks: 12,
    subject: '9708',
    // Ranges rather than exact marks: band placement varies run to run, and
    // pinning a number here would fail on noise instead of on regression.
    answers: [
      {
        label: 'theory, evaluation and a counter-case',
        answer:
          'A national minimum wage set above the equilibrium wage creates excess supply of labour, so a competitive model predicts unemployment. The size depends on elasticity of demand for labour: where labour is a small share of costs, demand is inelastic and job losses are small. In a monopsony, however, a minimum wage set between the monopsony wage and the competitive wage raises both wages and employment, since the firm no longer restricts hiring to hold the wage down. Efficiency wage effects may raise productivity and offset the cost. The claim that it will always reduce employment is therefore too strong: it depends on market structure, elasticity, and the level set.',
        min: 8,
        max: 12,
      },
      {
        label: 'correct theory, no evaluation',
        answer:
          'A national minimum wage is a price floor set above the equilibrium wage. At this higher wage, the quantity of labour supplied is greater than the quantity demanded. This creates a surplus of labour, which is unemployment. Firms have to pay more per worker so they hire fewer workers. This can be shown on a demand and supply diagram for labour, where the minimum wage line is drawn above the equilibrium point.',
        min: 4,
        max: 8,
      },
      {
        label: 'assertion only, no economics',
        answer:
          'I think a minimum wage is a good thing because workers need more money to live on. Some businesses might not like it and could sack people, but the government should still do it because it is fair. So it does not always reduce employment.',
        min: 0,
        max: 4,
      },
    ],
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

  if (process.argv.includes('--full')) {
    for (const set of DISCRIMINATION) {
      console.log(`\n${set.name}`)
      const marks: number[] = []
      for (const a of set.answers) {
        let r: Record<string, unknown>
        try {
          r = (await runSingleQuestionMark({
          pageFiles: [],
          answerPdf: null,
          answerText: a.answer,
          questionPhoto: null,
          questionTextInput: set.questionTextInput,
          manualPaperCode: set.manualPaperCode,
          manualPaperSession: null,
          manualQuestionNumber: null,
          markIntent: 'past_paper',
          fallbackSubjectCode: set.subject,
          questionMarks: set.questionMarks,
          userId: null,
            onProgress: () => {},
          } as Parameters<typeof runSingleQuestionMark>[0])) as Record<
            string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any
          >
        } catch (err) {
          // One rate-limited call used to abort the whole run, losing every
          // case after it — including the essay set, which never executed.
          // A marking error is not a marking result and must not be scored as
          // one, but it must not silence the rest either.
          failed++
          console.error(
            `  ERROR ${a.label}: ${(err as Error).message.split('\n')[0].slice(0, 90)}`
          )
          continue
        }
        const earned = Number(result_marks(r))
        marks.push(earned)
        const inRange = earned >= a.min && earned <= a.max
        if (!inRange) failed++
        console.log(
          `  ${a.label.padEnd(38)} ${earned}/${set.questionMarks}` +
            (inRange ? '  ok' : `  FAIL expected ${a.min}-${a.max}`)
        )
      }
      // The ordering matters as much as the ranges. A marker that lands every
      // answer inside a wide band while ranking them wrongly is still useless,
      // and ranges alone would not notice.
      for (let i = 1; i < marks.length; i++) {
        if (marks[i] > marks[i - 1]) {
          failed++
          console.error(
            `  FAIL a weaker answer outscored a stronger one: ${marks[i - 1]} then ${marks[i]}`
          )
        }
      }
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

/** Reads marks_earned without widening the result type at every call site. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function result_marks(r: Record<string, any>): number {
  return r.marks_earned
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
