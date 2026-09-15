/**
 * Which catalogued component to mark against when the UI never asked.
 *
 * The component picker only appears for subjects whose assessment is a numbered
 * paper. Everything portfolio-shaped — TOK, the Extended Essay, Visual Arts —
 * has no picker, and `resolvePracticeIb` refuses to resolve without a component
 * key (and, for the core, without an HL/SL level). So the verbatim, source-cited
 * descriptors in `ib_criterion_band` were unreachable for exactly the subjects
 * whose marking depends most on them, and a hardcoded placeholder marked
 * instead.
 *
 * Mapping the default here restores the real rubric. Where a subject has
 * several components that are genuinely different assessments, the most common
 * submission is the default and the others are chosen only on an explicit
 * textual signal — a guess between them would mark a student against the wrong
 * assessment entirely, which is worse than the generic fallback.
 *
 * Subjects whose picker exists but is optional belong here too: a student who
 * skips it lands in the same place as one who was never asked. Language B is
 * mapped on that basis; its default is reached by eliminating the components a
 * written submission cannot be, not by picking the likeliest.
 *
 * Deliberately NOT mapped, and why:
 *   - Psychology, Economics — their paper components LOOK criteria-marked and
 *     are not. The rows are per-question slots for a whole paper: Psychology
 *     paper_1 is "Section A: question 1" (4), "Section A: question 2" (4),
 *     "Section B: question 1" (6) … and Economics paper_1 is "Part (a) 10-mark
 *     question" and "Part (b) 15-mark question". Marking one practice answer
 *     against those would score it against a rubric expecting five questions
 *     and a 35-mark denominator. Their genuine criteria live on the IA
 *     components, which a practice upload is not. Do not wire these up on the
 *     strength of `assessment_model = 'criteria'` alone — read the criterion
 *     NAMES first.
 *   - Philosophy — paper_1's catalogue max is the whole paper (3 essays at HL),
 *     so a single practice essay has no matching denominator.
 *   - Business Management, Geography — their written papers are points-marked;
 *     the criteria components are the IA and HL paper 3, which a practice
 *     upload is unlikely to be.
 *   - English A: Literature — a different subject from Language and Literature,
 *     with its own guide, and not in the catalogue at all.
 */

export type IbDefaultComponent = {
  /** Subject code as the catalogue stores it. */
  subjectCode: string
  componentKey: string
  /** Level the catalogue lookup should filter on. */
  level: 'HL' | 'SL'
}

/**
 * Level is meaningless for the core — every core component is stored as
 * `level: 'both'` and `levelMatches` accepts either — but the catalogue
 * accessor demands one, so pick a side and be explicit about why.
 */
export const IB_CORE_LEVEL = 'SL' as const

function levelFromProfileCode(code: string): 'HL' | 'SL' | null {
  const m = code.match(/-(hl|sl)$/i)
  return m ? (m[1].toUpperCase() as 'HL' | 'SL') : null
}

/**
 * The component a submission for `profileCode` should be marked against, or
 * null when the subject has no catalogued default and should fall back.
 *
 * Film and Theatre were briefly mapped here and have been withdrawn: the guides
 * in the repo are superseded (Theatre 2017 was last assessed in 2023, Film 2019
 * by a 2023 second edition), so their catalogue rows were removed. Do not
 * re-add a mapping before the current guide is ingested — a route to a
 * component that does not exist silently costs the rubric, and a route to a
 * withdrawn one costs more than that.
 */
export function resolveIbCoreComponent(
  profileCode: string,
  questionText?: string | null
): IbDefaultComponent | null {
  const code = profileCode.trim().toLowerCase()
  const text = questionText ?? ''

  if (code === 'ib-extended-essay') {
    return {
      subjectCode: 'ib-extended-essay',
      componentKey: 'ee',
      level: IB_CORE_LEVEL,
    }
  }

  if (code === 'ib-tok') {
    // The essay responds to a prescribed title; the exhibition explains three
    // objects against an IA prompt. Not interchangeable.
    const isExhibition = /\bexhibition\b|\bIA prompt\b|three objects/i.test(text)
    return {
      subjectCode: 'ib-tok',
      componentKey: isExhibition ? 'tok_exhibition' : 'tok_essay',
      level: IB_CORE_LEVEL,
    }
  }

  if (code.startsWith('ib-visual-arts')) {
    const level = levelFromProfileCode(code)
    if (!level) return null
    // Visual Arts has three parts and the catalogue keys two of them by level.
    // The comparative study is the default because it is the written component
    // a student can actually submit for text marking; the exhibition's
    // curatorial rationale and the process portfolio are recognised only when
    // named.
    if (/process portfolio/i.test(text)) {
      return {
        subjectCode: 'ib-visual-arts',
        componentKey: 'process_portfolio',
        level,
      }
    }
    if (/\bexhibition\b|curatorial rationale/i.test(text)) {
      return {
        subjectCode: 'ib-visual-arts',
        componentKey: `exhibition_${level.toLowerCase()}`,
        level,
      }
    }
    return {
      subjectCode: 'ib-visual-arts',
      componentKey: `comparative_study_${level.toLowerCase()}`,
      level,
    }
  }

  // Language B — every language shares the `ib-language-b` guide.
  //
  // This one is not portfolio-shaped: the picker does appear. It is here
  // because skipping an optional picker and never being offered one leave the
  // student in exactly the same place — marked against a holistic band while
  // the verbatim criteria sit in the catalogue. On 2026-09-14 that turned an IB
  // French B Paper 1 diary entry worth 8/12 into 1/12.
  //
  // Paper 1 is chosen by elimination rather than by guessing, which is what the
  // rule at the top of this file demands. Of the three components only two are
  // criteria-marked: paper_1 (productive writing, A:12 B:12 C:6 out of 30) and
  // io. `io` is an individual ORAL — it needs a recording, and a typed or
  // photographed text cannot be one. paper_2 is receptive skills and is
  // points-marked, so it carries no criteria to mark against. A written
  // practice submission in Language B is therefore Paper 1, and no other
  // component is a candidate for it.
  if (/^ib-[a-z]+-b(-(hl|sl))?$/.test(code)) {
    const level = levelFromProfileCode(code)
    if (!level) return null
    return { subjectCode: 'ib-language-b', componentKey: 'paper_1', level }
  }

  // Language A: Language and Literature. Every component here carries real
  // assessment criteria for a single piece of writing — A understanding,
  // B analysis and evaluation, C focus and organisation, D language — so
  // marking against them is sound wherever we land.
  //
  // `io` is an individual oral, excluded by modality as in Language B.
  // `hl_essay` shares Paper 1's shape exactly (A-D, 5 each, 20 total), so
  // confusing the two costs almost nothing. Paper 1 and Paper 2 are the pair
  // that matter: Paper 1 is guided analysis of ONE unseen text, Paper 2 a
  // COMPARATIVE essay on two studied works, marked A:10 B:10 C:5 D:5 out of 30.
  // Paper 1 is the default because guided analysis is the ordinary practice
  // exercise; Paper 2 is taken only on an explicit comparative signal, which is
  // the same test the TOK essay/exhibition split uses above.
  //
  // Deliberately matches lang-lit ONLY. English A: Literature is a different
  // subject with its own guide and is not in the catalogue — routing it here
  // would mark a Literature student against Language and Literature criteria.
  //
  // Guide currency: the catalogued Lang-Lit criteria come from the 2021 guide,
  // last assessed 2025, so a student working now sits a newer one. That is not
  // a reason to withhold the rubric — describeGuide() marks the result
  // `withdrawn` and MarkingResultView shows the caution, so the student is told
  // which guide judged them. Real criteria plus an honest notice beats the
  // holistic band and silence this replaced. It IS a reason to keep the notice:
  // without it this becomes the silent route to a withdrawn guide that the
  // Film/Theatre note above forbids.
  if (/^ib-english-a-lang-lit-(hl|sl)$/.test(code)) {
    const level = levelFromProfileCode(code)
    if (!level) return null
    const isComparative =
      /\bcompare\b|\bcomparison\b|\bcomparative\b|both works|two works|two texts|each of the works/i.test(
        text
      )
    return {
      subjectCode: 'ib-lang-a-langlit',
      componentKey: isComparative ? 'paper_2' : 'paper_1',
      level,
    }
  }

  return null
}
