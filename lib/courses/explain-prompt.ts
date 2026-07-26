import type { LessonNote } from '@/lib/courses/margin-notes/types'
import type { ExplainIntent } from '@/lib/courses/explain-block-key'
import { isIbSubjectCode } from '@/lib/courses/board'

/**
 * Prompt for the per-paragraph "Explain more" feature.
 *
 * The whole risk of this feature is a fluent explanation that drifts off
 * syllabus — for an exam product that is worse than offering nothing. So the
 * model is given the paragraph, the lesson's own objectives and the board's
 * vocabulary, and told explicitly that it may not go beyond them.
 */

export type ExplainPromptInput = {
  subjectCode: string
  subjectName: string
  lessonTitle: string
  topicCode: string
  block: LessonNote
  /** Lesson `learningObjectives`, plus syllabus sub-topics where we have them. */
  objectives: string[]
  intent: ExplainIntent
}

/**
 * Re-exported for callers that already import from here. The rule lives in
 * lib/courses/board.ts — a prefix test was wrong for the canonical IB route,
 * which passes an unprefixed slug, and would have prompted the model for
 * Cambridge B1/M1/A1 marks on a markband subject.
 */
export function isIbCourseCode(subjectCode: string): boolean {
  return isIbSubjectCode(subjectCode)
}

const INTENT_BRIEF: Record<ExplainIntent, string> = {
  simpler:
    'Restate this paragraph in plain English. Same claim, same scope — strip the jargon, or define it in passing the first time it appears. Do not add new content. Maximum 120 words.',
  why: 'Explain where this comes from: the derivation, mechanism or causal chain behind the claim in this paragraph. Answer "why is this true / why does this happen", not "what is it". Maximum 120 words.',
  example:
    'Give ONE concrete worked instance of the idea in this paragraph — real numbers, a specific case, or a short scenario — and show how it plays out step by step. One example only, fully worked. Maximum 150 words.',
}

export function buildExplainSystemPrompt(input: ExplainPromptInput): string {
  const ib = isIbCourseCode(input.subjectCode)

  const boardRules = ib
    ? `This is an IB Diploma subject. Use IB vocabulary: markbands, assessment criteria, command terms, grades 1–7. NEVER use Cambridge mark codes (B1/M1/A1) or grades A*–E — the IB does not use them.`
    : `This is a Cambridge subject (${input.subjectCode}). Use Cambridge vocabulary: mark codes (B1/M1/A1), grades A*–E. Do not describe the answer in IB markband terms.`

  const objectives = input.objectives.length
    ? input.objectives.map((o) => `- ${o}`).join('\n')
    : '(none recorded for this lesson — stay strictly within the paragraph below)'

  return `You are the MarkScheme course tutor. A student is reading a ${input.subjectName} lesson and has tapped for more help on ONE paragraph. You are explaining that paragraph and nothing else.

${boardRules}

LESSON: ${input.lessonTitle} (syllabus ${input.topicCode})

WHAT THIS LESSON IS ALLOWED TO COVER:
${objectives}

HARD RULES:
- Explain only what is in the student's paragraph. Do not introduce material beyond the objectives above — going off-syllabus actively costs this student marks.
- Do not restate the paragraph verbatim; the student has already read it and it did not land. Come at it differently.
- No preamble ("Sure!", "Great question"), no sign-off, no headings. Start with the explanation itself.
- Plain prose or a short list. No headers.
- Every mathematical expression — even a single variable like $a$ or $\\theta$, and fractions like $\\frac{1}{2}$ — must be wrapped in $...$ (inline) or $$...$$ (display). NEVER use backticks or code blocks for maths, and NEVER use bare parentheses as a substitute (WRONG: "the value (x^2)"; RIGHT: "the value $x^2$").
- If the paragraph genuinely cannot be explained further without going beyond the syllabus, say so in one sentence rather than inventing scope.

YOUR TASK:
${INTENT_BRIEF[input.intent]}`
}

export function buildExplainUserPrompt(block: LessonNote): string {
  const parts = [`Section heading: ${block.h}`, '', 'Paragraph:', block.p]
  if (block.bullets?.length) {
    parts.push('', 'Key points listed alongside it:', ...block.bullets.map((b) => `- ${b}`))
  }
  if (block.tip) {
    parts.push('', `Exam tip attached to this section: ${block.tip}`)
  }
  return parts.join('\n')
}
