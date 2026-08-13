/**
 * Catalogued components for the IB core — TOK and the Extended Essay.
 *
 * These are the only markable subjects with no HL/SL level and no component
 * picker in the UI, which is exactly why their marking silently fell through to
 * a hardcoded placeholder rubric: `resolvePracticeIb` bails when a code carries
 * no `-hl`/`-sl` suffix, so the verbatim, source-cited descriptors sitting in
 * `ib_criterion_band` were never reached.
 *
 * Mapping them here restores the real rubric. It matters more for these two
 * than for anything else in the diploma: a TOK essay is a single holistic
 * 10-mark judgement and an EE is 34 marks across five criteria, so a wrong
 * rubric is not a rounding error — it is a different exam.
 */

export type IbCoreComponent = {
  /** Subject code as the catalogue stores it. */
  subjectCode: string
  componentKey: string
}

/**
 * Level is meaningless for the core — every core component is stored as
 * `level: 'both'`, and `levelMatches` accepts either — but the catalogue
 * accessor demands one, so pick a side and be explicit about why.
 */
export const IB_CORE_LEVEL = 'SL' as const

/**
 * Which component a core submission should be marked against.
 *
 * TOK has two, and they are not interchangeable: the essay responds to a
 * prescribed title, the exhibition explains three objects against an IA prompt.
 * The essay is the default because it is the far more common submission; the
 * exhibition is chosen only on an explicit signal rather than a guess, since
 * marking an essay against exhibition descriptors would be worse than the
 * generic fallback.
 */
export function resolveIbCoreComponent(
  subjectCode: string,
  questionText?: string | null
): IbCoreComponent | null {
  const code = subjectCode.trim().toLowerCase()

  if (code === 'ib-extended-essay') {
    return { subjectCode: 'ib-extended-essay', componentKey: 'ee' }
  }

  if (code === 'ib-tok') {
    const looksLikeExhibition = /\bexhibition\b|\bIA prompt\b|three objects/i.test(
      questionText ?? ''
    )
    return {
      subjectCode: 'ib-tok',
      componentKey: looksLikeExhibition ? 'tok_exhibition' : 'tok_essay',
    }
  }

  return null
}
