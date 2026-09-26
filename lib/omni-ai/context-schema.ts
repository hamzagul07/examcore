import { z } from 'zod'
import type { AIContextType } from './types'

/**
 * Request-body validation for POST /api/omni-ai.
 *
 * `context` and `messages` are read straight off the request body and used to
 * build the system prompt. Before this schema existed the route trusted their
 * shape: `context.data.coverage.toFixed(0)` threw on a string, and — because
 * the prompt was built AFTER `recordOmniUsage` — the student was charged a
 * message for a 500 (code review 2026-09-25, §3 `system-prompts.ts:141,149`).
 * Nothing bounded prompt size either: the client trims the query to 2,000
 * chars but the server accepted any length, and history messages had no cap
 * at all (§2 "Omni: no server-side prompt-size bound").
 *
 * The route parses with this schema before anything is metered or spent, and
 * answers 400 on failure, so a malformed body costs nothing.
 *
 * Numbers are coerced (a "42" from a serialized store becomes 42) but must be
 * finite: NaN would not throw on `.toFixed` but would put "NaN%" in the prompt.
 */

export const OMNI_QUERY_MAX_CHARS = 2_000
export const OMNI_HISTORY_MAX_MESSAGES = 8
/**
 * Per-message cap. History content is TRUNCATED rather than rejected: an
 * assistant reply at the 1,500-token output cap can run past 4k chars, and a
 * 400 on the student's next message because our own previous answer was long
 * would be a self-inflicted outage. The query itself is rejected when
 * oversize — the UI enforces the same cap, so only a non-UI client can hit it.
 */
export const OMNI_MESSAGE_MAX_CHARS = 4_000

const finiteNumber = z.coerce
  .number()
  .refine((n) => Number.isFinite(n), { message: 'must be a finite number' })

// Short free-text fields that land in the prompt. Caps are generous for real
// data and tight enough that no single field can carry a wall of text.
const shortText = (max: number) => z.string().max(max)
const idText = z.string().trim().min(1).max(64)

const MarkSummarySchema = z.object({
  mark_id: z.union([z.number(), shortText(32)]).optional(),
  type: shortText(32).optional(),
  earned: z.boolean().optional(),
  error_classification: shortText(120).nullable().optional(),
  margin_note: shortText(500).nullable().optional(),
  reasoning: shortText(1_000).optional(),
})

const WeakTopicSchema = z.object({
  code: shortText(32),
  name: shortText(120),
  percentage: finiteNumber,
})

/**
 * The prompt reads the first three weak topics and nothing more. The client
 * (app/dashboard/progress/page.tsx) sends every 'critical' leaf mastery,
 * unsliced, and a student with more than fifty of them got a 400 on every
 * message sent from that page — `.max(50)` REJECTS. Truncated instead: the
 * list is bounded for prompt-size reasons, not because a long list is wrong.
 */
export const OMNI_WEAK_TOPICS_MAX = 50
const WeakTopicsSchema = z
  .array(WeakTopicSchema)
  .transform((topics) => topics.slice(0, OMNI_WEAK_TOPICS_MAX))

/**
 * A teacher page's Omni address: which class, which view. Deliberately no
 * figures — the route loads the class's facts server-side after checking the
 * caller teaches it (lib/omni-ai/teacher-context.ts), and the prompt never
 * reads `context.data`. Unknown keys (an old client's `classMetrics`, a
 * crafted roster) are dropped here. `classroom_id` is only length-bounded:
 * parseTeacherOmniRequest validates it strictly and answers a malformed one
 * with its own 400.
 */
const TeacherAddressSchema = z.object({
  classroom_id: z.string().max(64).optional(),
  view: z.string().max(32).optional(),
})

export const AIContextSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('landing') }),
  z.object({
    type: z.literal('dashboard_home'),
    data: z.object({
      name: shortText(80),
      streak: finiteNumber,
      attemptCount: finiteNumber,
    }),
  }),
  z.object({
    type: z.literal('mastery_matrix'),
    data: z.object({
      weakTopics: WeakTopicsSchema,
      coverage: finiteNumber,
    }),
  }),
  z.object({
    type: z.literal('examiner_ink'),
    data: z.object({
      attemptId: idText,
      questionText: shortText(4_000),
      marksAwarded: z.array(MarkSummarySchema).max(100),
      // Never read by the prompt; accepted for type compatibility, bounded so
      // it cannot be used as a payload carrier.
      lineReferences: z.array(z.unknown()).max(500).optional().default([]),
      score: shortText(32),
    }),
  }),
  z.object({
    type: z.literal('marking_result'),
    data: z.object({ attemptId: idText }),
  }),
  z.object({
    type: z.literal('marking'),
    data: z.object({ mode: z.enum(['past_paper', 'general']) }),
  }),
  z.object({
    type: z.literal('teacher_dashboard'),
    data: TeacherAddressSchema.optional().default({}),
  }),
])

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .transform((s) =>
      s.length > OMNI_MESSAGE_MAX_CHARS
        ? `${s.slice(0, OMNI_MESSAGE_MAX_CHARS)}…`
        : s
    ),
})

export const OmniRequestBodySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Empty query')
    .max(OMNI_QUERY_MAX_CHARS, `Query is too long (max ${OMNI_QUERY_MAX_CHARS} characters)`),
  context: AIContextSchema.optional().default({ type: 'landing' }),
  messages: z
    .array(z.unknown())
    .max(200)
    .optional()
    .default([])
    .transform((raw) => {
      // Keep the LAST eight well-formed turns: that is the recent context the
      // model needs, and it matches what the client already sends. Malformed
      // entries are dropped rather than failing the whole request, because a
      // stale client store is not the student's fault.
      const parsed: z.infer<typeof HistoryMessageSchema>[] = []
      for (const item of raw) {
        const r = HistoryMessageSchema.safeParse(item)
        if (r.success && r.data.content.trim()) parsed.push(r.data)
      }
      return parsed.slice(-OMNI_HISTORY_MAX_MESSAGES)
    }),
  attemptId: idText.optional(),
})

export type ParsedOmniRequest = z.infer<typeof OmniRequestBodySchema>
export type ParsedAIContext = z.infer<typeof AIContextSchema>

// Compile-time guarantee that what the schema produces is what the prompt
// builder consumes; a drift here fails typecheck rather than a request.
type _ParsedContextIsAIContext = ParsedAIContext extends AIContextType
  ? true
  : never
const _contextShapeMatches: _ParsedContextIsAIContext = true
void _contextShapeMatches

export type ParseOmniRequestResult =
  | { ok: true; body: ParsedOmniRequest }
  | { ok: false; error: string }

/** Shape check for the route. One-line error, safe to echo to the client. */
export function parseOmniRequestBody(raw: unknown): ParseOmniRequestResult {
  const result = OmniRequestBodySchema.safeParse(raw)
  if (result.success) return { ok: true, body: result.data }
  const first = result.error.issues[0]
  const path = first?.path?.length ? `${first.path.join('.')}: ` : ''
  return { ok: false, error: `Invalid request — ${path}${first?.message ?? 'bad shape'}` }
}
