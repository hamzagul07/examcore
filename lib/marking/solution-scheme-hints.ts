/**
 * Build mark-scheme context for full-solution generation without feeding
 * "why you lost the mark" examiner reasoning into the model answer.
 */

export type SolutionHintAward = {
  type?: string
  earned?: boolean
  reasoning?: string
  line_reference?: string
  description?: string
}

export function buildSolutionSchemeHints(input: {
  officialScheme?: unknown
  officialTotal?: number | null
  awards?: SolutionHintAward[] | null
  attemptTotal?: number | null
  aiTotal?: number | null
}): string {
  if (input.officialScheme) {
    return `Official mark scheme (for reference — write the ANSWER, not mark codes):
${JSON.stringify(input.officialScheme, null, 2)}

Total marks: ${input.officialTotal ?? input.attemptTotal ?? '(unknown)'}
`
  }

  const awards = Array.isArray(input.awards) ? input.awards : []
  if (awards.length > 0) {
    const lines = awards
      .map((m, i) => {
        const code = m.type || `P${i + 1}`
        // Prefer neutral "what to show" cues. Never use examiner reasoning —
        // failed points often say what the student did wrong.
        const tip = (m.line_reference || m.description || '').trim()
        if (!tip) return `- ${code}`
        return `- ${code}: ${tip}`
      })
      .filter(Boolean)

    return `What a full-marks answer must show (neutral mark points only — do not copy student mistakes):
${lines.join('\n')}

Total marks: ${input.aiTotal ?? input.attemptTotal ?? awards.length}
`
  }

  const total = input.attemptTotal
  return total && total > 0 ? `This question is worth ${total} marks.\n` : ''
}
