/**
 * Curated study tips keyed by "subjectCode:syllabusTag".
 * Edit this file to add or refine tips — no component changes required.
 *
 * @example
 * '9701:9.1': 'Your tip text here.',
 */

export const STUDY_TIPS: Record<string, string> = {
  // ── Mathematics 9709 Paper 1 ─────────────────────────────────────────────
  '9709:1.1':
    'When completing the square on $ax^2 + bx + c$, factor out the $a$ from the $x^2$ and $x$ terms first — then complete inside the bracket. Half of mistakes happen from skipping that factoring step.',
  '9709:1.2':
    'For inverse functions, state the domain restriction before finding $f^{-1}$. Examiners deduct when students invert without checking one-to-one behaviour on the given domain.',
  '9709:1.5':
    'When solving $\\sin\\theta = k$ over $0 \\le \\theta \\le 2\\pi$, find ALL solutions — students typically give one and forget the second by symmetry. The mark scheme awards the second solution separately.',
  '9709:1.6':
    'For arithmetic series, write out the first three terms before applying the sum formula. Students often confuse $a + (n-1)d$ (nth term) with $\\frac{n}{2}[2a + (n-1)d]$ (sum) — mixing them is a common method-mark loss.',
  '9709:1.7':
    'For implicit differentiation, write $\\frac{dy}{dx}$ as a separate factor when differentiating $y^2 \\to 2y \\cdot \\frac{dy}{dx}$. Half of students drop the chain rule and lose the method mark.',
  '9709:1.8':
    'Integration marks split into antiderivative (M1) and simplified result (A1). Even with the integral correct, examiners deduct if you leave $+C$ off indefinite integrals or skip evaluating limits properly on definite ones.',

  // ── Chemistry 9701 ───────────────────────────────────────────────────────
  '9701:9.1':
    'For isoelectronic ions, nuclear charge increases left to right in the period — smaller radius is not always “more protons” without mentioning electron count and shielding.',
  '9701:1.1':
    'Table questions on nucleon number, proton number, and electrons need consistent definitions: nucleon number is protons + neutrons; charge tells you electrons for ions.',
  '9701:5.1':
    'Equilibrium answers must include “closed system” and “rates equal” where the mark scheme asks for conditions. Vague “balance” wording often scores zero for the condition mark.',

  // ── Physics 9702 ─────────────────────────────────────────────────────────
  '9702:1.1':
    'Always quote units with magnitudes in standard form where appropriate, and use base SI units in working unless the question gives derived units explicitly.',
  '9702:2.1':
    'For suvat problems, write your sign convention (positive direction) at the start. Students often get negative time or impossible speeds because they swap conventions mid-working, costing accuracy marks even when the method is right.',
  '9702:6.1':
    'Wave questions: distinguish phase difference from path difference — include $\lambda$ in path-difference answers when the mark scheme links them.',

  // ── Biology 9700 ─────────────────────────────────────────────────────────
  '9700:1.1':
    'Cell ultrastructure labels must match Cambridge terminology (e.g. cristae vs “folds”). One wrong label can cost both the label mark and the linked explanation.',
  '9700:3.1':
    'Enzyme graphs: explain shape using collision theory and active site complementarity — “enzyme fits substrate” alone is rarely enough for full marks.',
  '9700:6.1':
    'In genetic diagrams, state genotype and phenotype ratios separately; students often give ratios without specifying which is which.',

  // ── History 9489 ─────────────────────────────────────────────────────────
  '9489:essay-structure':
    'Essay introductions should signpost an argument, not narrate events. One sentence of context, then your line of judgement — examiners mark argument, not storytelling.',
  '9489:source-analysis':
    'For source questions, pair content (what the source shows) with provenance (who, when, why) before evaluation — half the marks are usually for provenance use, not summary.',

  // ── Economics 9708 ───────────────────────────────────────────────────────
  '9708:data-response':
    'Data-response: define the term in the first sentence, use the extract data with units, then explain the mechanism — marks drop when students jump to theory without citing the figure.',
  '9708:2.1':
    'Supply and demand shifts need a new equilibrium label on the diagram and written reference to price/quantity change — shifting curves without explaining equilibrium loses analysis marks.',

  // ── Accounting 9706 ──────────────────────────────────────────────────────
  '9706:1.1':
    'In journal entries, the narration line (the brief explanation under the Dr/Cr split) is worth its own mark. Students often skip it, treating it as cosmetic — examiners deduct.',
  '9706:3.1':
    'Depreciation methods: state which method the scenario requires before calculating — using straight-line when reducing balance is implied loses method marks.',

  // ── Computer Science 9618 ──────────────────────────────────────────────────
  '9618:1.1':
    'Trace tables must show every variable change per line — examiners penalise skipped iterations even when the final output is correct.',
  '9618:2.1':
    'Binary floating-point questions need explicit mention of mantissa and exponent; rounding errors must link to limited bits, not vague “computer inaccuracy”.',

  // ── Sociology 9699 ───────────────────────────────────────────────────────
  '9699:1.1':
    'Define the sociological term in the first sentence using Cambridge wording, then apply to the item — definition without application caps at low band.',

  // ── Psychology 9990 ──────────────────────────────────────────────────────
  '9990:1.1':
    'Name the study, one methodological detail, and link explicitly to the question stem — generic “supports the theory” without study detail scores limited credit.',

  // ── Business 9609 ────────────────────────────────────────────────────────
  '9609:1.1':
    'Stakeholder answers need impact on the business, not stakeholder feelings alone — tie each point to costs, revenue, risk, or reputation.',

  // ── Further Mathematics 9231 ─────────────────────────────────────────────
  '9231:1.1':
    'Complex number proofs require stating $z=a+ib$ and equating real/imaginary parts — skipping the definition step loses the first method mark.',

  // ── Law 9084 ───────────────────────────────────────────────────────────────
  '9084:1.1':
    'Issue statements should be one precise sentence per issue — vague “negligence might apply” without duty/breach/causation structure limits marks.',

  // ── Islamic Studies 9488 ───────────────────────────────────────────────────
  '9488:1.1':
    'Quote sparingly and explain the relevance to the question — long quotations without exegesis score knowledge but not application.',

  // ── Media Studies 9607 ─────────────────────────────────────────────────────
  '9607:1.1':
    'Audience theory answers must name the theory and apply to the specific text in the stimulus — generic media vocabulary without reference scores poorly.',
}

/** Strip accidental "9709:1.6" prefixes — production tags are short codes like "1.6". */
function syllabusTagCode(tag: string): string {
  const t = tag.trim()
  const colon = t.indexOf(':')
  if (colon > 0 && /^\d{4}$/.test(t.slice(0, colon))) {
    return t.slice(colon + 1).trim()
  }
  return t
}

/**
 * Returns a curated tip for subject + syllabus tag, or null (show topic only, no filler).
 * Keys in STUDY_TIPS use "subject:tag" (e.g. "9709:1.1"); Gemini emits short tags only.
 */
export function getStudyTip(subjectCode: string, tag: string): string | null {
  const subject = subjectCode.trim()
  const code = syllabusTagCode(tag)
  if (!subject || !code) return null
  return STUDY_TIPS[`${subject}:${code}`] ?? null
}

/** First tag with a curated tip, or first tag for topic display. */
export function pickPrimarySyllabusTag(
  subjectCode: string,
  tags: string[] | null | undefined
): string | null {
  if (!tags?.length) return null
  for (const tag of tags) {
    if (getStudyTip(subjectCode, tag)) return tag
  }
  return tags[0]
}
