/**
 * Intent system for the Instant-Action Agent (a.k.a. Command Bar) — the
 * conversational chatbot that lives on the landing page hero. Visitors type a
 * natural-language query, Claude classifies their intent, and the UI renders a
 * matching inline component (past paper, diagnostic, upload zone, CTA).
 *
 * This file is shared between the chat backend (`app/api/chat/route.ts`) and
 * the chat widget components (`components/command-bar/*`). Keep types here
 * narrow and JSON-serializable — they cross the API boundary.
 */

import type { SyllabusCode } from './syllabus'

export type ChatIntent =
  | 'past_paper_request' // "show me 9709 May/June 2024 Q1"
  | 'topic_help' // "I need help with integration"
  | 'exam_panic' // "I'm stressed about exams"
  | 'time_pacing' // "I keep running out of time"
  | 'platform_question' // "what does this do?"
  | 'general' // anything else

export type ChatActionType =
  | 'render_paper'
  | 'render_diagnostic'
  | 'render_upload'
  | 'render_cta'
  | 'render_signup'
  | 'none'

export interface ChatPaperPayload {
  subject_code: string
  session: string
  paper: string
  question_number: string
  question_text: string
  total_marks: number
  syllabus_tags: string[]
}

export interface ChatDiagnosticPayload {
  topic_code: SyllabusCode
  topic_name: string
  question_text: string
  total_marks: number
}

export interface ChatCtaPayload {
  text: string
  href: string
  style: 'primary' | 'secondary'
}

export interface ChatAction {
  type: ChatActionType
  paper?: ChatPaperPayload
  diagnostic?: ChatDiagnosticPayload
  cta?: ChatCtaPayload
  /**
   * Hint produced by Claude during intent classification. Used server-side to
   * map a free-form topic name (e.g. "Areas under curves") to a syllabus code
   * for diagnostic question lookup. Never rendered.
   */
  diagnostic_topic_hint?: string
}

export interface ChatRequestMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  query: string
  messages?: ChatRequestMessage[]
}

export interface ChatResponse {
  intent: ChatIntent
  response_text: string
  action: ChatAction
}

export const VALID_INTENTS: readonly ChatIntent[] = [
  'past_paper_request',
  'topic_help',
  'exam_panic',
  'time_pacing',
  'platform_question',
  'general',
] as const

export const VALID_ACTION_TYPES: readonly ChatActionType[] = [
  'render_paper',
  'render_diagnostic',
  'render_upload',
  'render_cta',
  'render_signup',
  'none',
] as const

/**
 * Map a free-form topic phrase to a Cambridge 9709 syllabus code. Keyword
 * matching only — kept simple on purpose, because Claude already does the
 * heavy lifting of choosing the topic phrase.
 */
export function inferTopicCode(hint: string | undefined | null): SyllabusCode {
  const h = (hint || '').toLowerCase()
  // Order matters: more specific keywords first.
  if (h.includes('normal distribution')) return '5.5'
  if (h.includes('probability') || h.includes('combinatorics') || h.includes('permutation')) return '5.3'
  if (h.includes('hypothesis')) return '6.5'
  if (h.includes('poisson')) return '6.1'
  if (h.includes('kinematics') || h.includes('motion') || h.includes('velocity')) return '4.2'
  if (h.includes('mechanics') || h.includes('force') || h.includes('equilibrium')) return '4.1'
  if (h.includes('momentum')) return '4.3'
  if (h.includes('energy') || h.includes('work') || h.includes('power')) return '4.5'
  if (h.includes('vector')) return '3.7'
  if (h.includes('complex')) return '3.9'
  if (h.includes('differential equation')) return '3.8'
  if (h.includes('integration') || h.includes('integral') || h.includes('area under')) return '1.8'
  if (h.includes('differentiation') || h.includes('derivative') || h.includes('tangent') || h.includes('stationary')) return '1.7'
  if (h.includes('series') || h.includes('binomial') || h.includes('arithmetic') || h.includes('geometric'))
    return '1.6'
  if (h.includes('trig')) return '1.5'
  if (h.includes('circular') || h.includes('radian') || h.includes('arc length')) return '1.4'
  if (h.includes('coordinate') || h.includes('circle') || h.includes('line')) return '1.3'
  if (h.includes('function') || h.includes('inverse')) return '1.2'
  if (h.includes('quadratic') || h.includes('discriminant')) return '1.1'
  // Fallback: Integration is the most common entry-level topic students panic about.
  return '1.8'
}
