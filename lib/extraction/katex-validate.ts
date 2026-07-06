import katex from 'katex'

export type KatexFragmentResult = {
  fragment: string
  displayMode: boolean
  parseable: boolean
  error: string | null
}

/** Inline math delimiters; `\$` is escaped currency and must not open a math span. */
const INLINE_MATH_RE = /(?<!\$)(?<!\\)\$(?!\$)([^$\n]+?)(?<!\\)\$(?!\$)/g
const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$/g

/** Extract inline and display LaTeX fragments from question text. */
export function extractLatexFragments(text: string): KatexFragmentResult[] {
  const results: KatexFragmentResult[] = []

  for (const match of text.matchAll(DISPLAY_MATH_RE)) {
    const fragment = match[1]?.trim() ?? ''
    if (fragment) {
      results.push(validateKatexFragment(fragment, true))
    }
  }

  const withoutDisplay = text.replace(DISPLAY_MATH_RE, '')
  for (const match of withoutDisplay.matchAll(INLINE_MATH_RE)) {
    const fragment = match[1]?.trim() ?? ''
    if (fragment) {
      results.push(validateKatexFragment(fragment, false))
    }
  }

  return results
}

export function validateKatexFragment(
  latex: string,
  displayMode = false
): KatexFragmentResult {
  try {
    katex.renderToString(latex, {
      displayMode,
      throwOnError: true,
      strict: 'error',
      trust: false,
    })
    return { fragment: latex, displayMode, parseable: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { fragment: latex, displayMode, parseable: false, error: message }
  }
}

export type KatexValidationSummary = {
  fragmentCount: number
  failedFragments: KatexFragmentResult[]
  allParseable: boolean
  /** 1.0 when no math or all parse; penalized per failed fragment. */
  confidencePenalty: number
}

/**
 * Score KaTeX parseability for a question body.
 * Any unparseable fragment forces confidence below LOW_EXTRACTION_CONFIDENCE_THRESHOLD.
 */
export function summarizeKatexValidation(text: string): KatexValidationSummary {
  const fragments = extractLatexFragments(text)
  const failedFragments = fragments.filter((f) => !f.parseable)

  if (fragments.length === 0) {
    return {
      fragmentCount: 0,
      failedFragments: [],
      allParseable: true,
      confidencePenalty: 0,
    }
  }

  const penalty = failedFragments.length / fragments.length
  return {
    fragmentCount: fragments.length,
    failedFragments,
    allParseable: failedFragments.length === 0,
    confidencePenalty: penalty,
  }
}

export function katexConfidenceScore(text: string): number {
  const summary = summarizeKatexValidation(text)
  if (summary.fragmentCount === 0) return 1
  return Math.max(0, 1 - summary.confidencePenalty)
}
