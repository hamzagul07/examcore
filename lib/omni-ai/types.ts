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
  /**
   * Teacher pages (lib/teacher/insights/omni.ts teacherOmniContext). Only an
   * address — which class and which view — never figures: /api/omni-ai checks
   * the teacher owns the class and loads the class facts itself
   * (lib/omni-ai/teacher-context.ts), so nothing a client sends here reaches
   * the prompt as data.
   */
  | { type: 'teacher_dashboard'; data: { classroom_id?: string; view?: string } }

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
