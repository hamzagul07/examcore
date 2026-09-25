import type {
  ChatCtaPayload,
  ChatDiagnosticPayload,
  ChatPaperPayload,
} from '@/lib/chat-intents'

export type AIContextType =
  | { type: 'landing'; data?: never }
  | {
      type: 'dashboard_home'
      data: { name: string; streak: number; attemptCount: number }
    }
  | {
      type: 'mastery_matrix'
      data: {
        weakTopics: { code: string; name: string; percentage: number }[]
        coverage: number
      }
    }
  | {
      type: 'examiner_ink'
      data: {
        attemptId: string
        questionText: string
        marksAwarded: Array<{
          mark_id?: number | string
          type?: string
          earned?: boolean
          error_classification?: string | null
          margin_note?: string | null
          reasoning?: string
        }>
        lineReferences: unknown[]
        score: string
      }
    }
  | {
      type: 'marking_result'
      data: { attemptId: string }
    }
  | { type: 'marking'; data: { mode: 'past_paper' | 'general' } }
  /** Scaffolded — activates when teacher dashboard pages ship. */
  | { type: 'teacher_dashboard'; data: { classMetrics?: unknown } }

export type OmniAIActionType =
  | 'render_paper'
  | 'render_diagnostic'
  | 'render_upload'
  | 'render_cta'

export interface OmniAIAction {
  type: OmniAIActionType | string
  params?: Record<string, string>
  paper?: ChatPaperPayload
  diagnostic?: ChatDiagnosticPayload
  cta?: ChatCtaPayload
}

export interface OmniAIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: OmniAIAction
  isStreaming?: boolean
  /** Pre-stream status from the server (e.g. looking up marks). */
  status?: string | null
}

/**
 * Wire shape for POST /api/omni-ai. The server validates and bounds it with
 * `OmniRequestBodySchema` (lib/omni-ai/context-schema.ts) before anything is
 * metered: query ≤ 2,000 chars, last 8 messages of ≤ 4,000 chars each.
 */
export interface OmniAIRequestBody {
  query: string
  context: AIContextType
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Optional — server loads this attempt for the authenticated user when context is marking_result. */
  attemptId?: string
}
