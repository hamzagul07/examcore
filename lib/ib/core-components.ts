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

  return null
}
