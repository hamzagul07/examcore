import { NextRequest } from 'next/server'
import type { Content, Part } from '@google/genai'
import {
  generateGeminiWithContents,
  isGeminiConfigured,
  streamGeminiWithContents,
  toGeminiContents,
} from '@/lib/ai/gemini-text'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildSystemPrompt } from '@/lib/omni-ai/system-prompts'
import { buildStudentMemoryBlock } from '@/lib/omni-ai/student-memory'
import { hasPaidAccess } from '@/lib/billing/features'
import {
  extractActionFromText,
  stripPartialActionTail,
} from '@/lib/omni-ai/actions'
import {
  createSupabaseAdmin,
  hydrateOmniAction,
} from '@/lib/omni-ai/hydrate-actions'
import {
  fetchAttemptDetailForUser,
  fetchRecentAttemptsForUser,
  formatAttemptForPrompt,
  loadAttemptForOmni,
} from '@/lib/omni-ai/marking-context'
import { OMNI_MARKING_TOOLS } from '@/lib/omni-ai/marking-tools'
import { shouldRunMarkingToolLoop } from '@/lib/omni-ai/tool-gate'
import { parseOmniRequestBody } from '@/lib/omni-ai/context-schema'
import {
  MAX_TOOL_ROUNDS,
  chargeToolResult,
  createToolBudget,
  type ToolPayload,
} from '@/lib/omni-ai/tool-budget'
import type { AIContextType } from '@/lib/omni-ai/types'
import {
  checkOmniAllowance,
  omniQuotaExceededBody,
  recordOmniUsage,
} from '@/lib/billing/enforcement'
import { secondsUntilUtcMidnight } from '@/lib/http/rate-limit-response'
import {
  RateLimitUnavailableError,
  checkAnonymousOmniRateLimit,
} from '@/lib/rate-limit'

export const maxDuration = 60

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

/** One-frame SSE error. The client reads `data:` lines off non-2xx bodies too. */
function sseError(
  status: number,
  payload: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(sse({ type: 'error', ...payload }), {
    status,
    headers: { ...SSE_HEADERS, ...extraHeaders },
  })
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  // Order matters here: nothing below spends anything — no guest slot, no
  // metered message, no model call — until the body has passed the schema.
  // The shape check used to come after metering, so a body with
  // `coverage: "abc"` was charged and then 500'd on `.toFixed`.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return sseError(400, { error: 'Invalid JSON body' })
  }

  const parsed = parseOmniRequestBody(raw)
  if (!parsed.ok) {
    return sseError(400, { error: parsed.error })
  }
  const { query, messages: history, attemptId: attemptIdFromBody } = parsed.body
  const context: AIContextType = parsed.body.context

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  const supabaseAdmin = createSupabaseAdmin()
  const supabaseService = createServiceClient()

  const markingAwareness = !!user && context.type !== 'teacher_dashboard'

  // Guests: one persisted daily cap per IP, consumed atomically up front by
  // the `bump_rate_limit` RPC (lib/rate-limit.ts). This used to sit behind an
  // in-process Map that promised "40 an hour" — per lambda, empty on every
  // cold start, and never evicted, so it was both porous and a slow leak. The
  // persisted bucket is the only guard now; signed-in users are metered by
  // their account quota below.
  if (!user) {
    let guestCheck: Awaited<ReturnType<typeof checkAnonymousOmniRateLimit>>
    try {
      guestCheck = await checkAnonymousOmniRateLimit(supabaseService, ip, null)
    } catch (err) {
      // The limiter could not be consulted. Fail closed for guests: an
      // unmetered model call is worse than a retryable error.
      if (err instanceof RateLimitUnavailableError) {
        console.error('[omni-ai] guest rate limit unavailable:', err.message)
        return sseError(
          503,
          { error: 'Chat is briefly unavailable. Please try again in a moment.' },
          { 'Retry-After': '30' }
        )
      }
      throw err
    }
    if (!guestCheck.allowed) {
      return sseError(
        429,
        { error: guestCheck.message },
        { 'Retry-After': String(secondsUntilUtcMidnight()) }
      )
    }
    // The check consumed the slot atomically; nothing more to record.
  }

  let studentMemoryBlock: string | null = null

  // Every signed-in message is metered, wherever it was sent from.
  //
  // This used to skip metering when `context.type === 'landing'`, but `context`
  // is read straight off the request body — so a free-tier account could post
  // `{"context":{"type":"landing"}}` and chat without limit, and authenticating
  // actually REMOVED the cap, since the persisted guest limit above only applies
  // when there is no user. The exemption was never needed for its stated purpose
  // either: the landing demo is unmetered for guests via that guest branch, and a
  // signed-in visitor on the landing page is still using their own account quota.
  if (user) {
    const omniAllowance = await checkOmniAllowance(user.id)
    if (omniAllowance.blocked_by_mode) {
      const body = omniQuotaExceededBody(omniAllowance)
      return sseError(402, {
        message:
          'You\'ve used all your study chat messages this month. Upgrade or top up credits to continue.',
        code: body.error,
        tier: body.tier,
        cap: body.cap,
        period_resets_at: body.period_resets_at,
        credit_balance: body.credit_balance,
        upgrade_url: body.upgrade_url,
      })
    }
    // Meter at the gate, not after the stream: recording only on completion
    // left a stream-length window where parallel requests near the cap all
    // passed the check before any usage row existed. Recording up front
    // shrinks that to milliseconds. Trade-off: a message that fails
    // mid-stream still counts — rare, and far cheaper than an open cap.
    try {
      await recordOmniUsage(user.id)
    } catch (err) {
      // Fail open: never block chat on our own metering error.
      console.error('[omni-ai] recordOmniUsage failed:', err)
    }

    // Premium: give the tutor memory of the student's marked work (weak topics,
    // grade trajectory, exam countdown) so it coaches with context. In-app
    // coaching chats only; best-effort — never block chat on it.
    //
    // Gate on the allowance's resolved `access`, not on `{tier, status}`
    // recomputed here: the recompute dropped teacher seats and comps, so a
    // verified teacher on a Scholar allowance got the free-tier tutor
    // (code review 2026-09-25, §2 "seats and comps ignored by feature gates").
    if (markingAwareness && hasPaidAccess(omniAllowance.access)) {
      try {
        studentMemoryBlock = await buildStudentMemoryBlock(supabaseService, user.id)
      } catch (err) {
        console.error('[omni-ai] student memory build failed:', err)
      }
    }
  }

  const attemptIdFromContext =
    context.type === 'marking_result' ? context.data.attemptId : undefined
  const resolvedAttemptId = attemptIdFromBody || attemptIdFromContext

  let focusedAttemptBlock: string | null = null
  if (user && resolvedAttemptId) {
    const row = await loadAttemptForOmni(
      supabaseService,
      resolvedAttemptId,
      user.id
    )
    if (row) {
      focusedAttemptBlock = formatAttemptForPrompt(row)
    }
  }

  // Tool loop is non-streaming and blocks first token. Only run when the
  // ask likely needs history that isn't already in the prompt.
  const toolsEnabled =
    markingAwareness &&
    shouldRunMarkingToolLoop(query, {
      hasFocusedAttempt: Boolean(focusedAttemptBlock),
    })

  const systemPrompt = buildSystemPrompt(context, {
    markingAwareness,
    toolsAvailable: toolsEnabled,
    focusedAttemptBlock,
    studentMemoryBlock,
  })

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(sse(data))

      try {
        if (!isGeminiConfigured()) {
          controller.enqueue(
            encode({
              type: 'done',
              cleanText:
                'Omni-AI is not configured. Set USE_VERTEX_AI + GOOGLE_CLOUD_PROJECT, or GEMINI_API_KEY. See docs/vertex-ai-migration.md',
              action: { type: 'render_upload' },
            })
          )
          controller.close()
          return
        }

        const contents: Content[] = [
          ...toGeminiContents(
            history.map((m) => ({
              role: m.role,
              content: m.content,
            }))
          ),
          { role: 'user', parts: [{ text: query }] },
        ]

        let fullText = ''
        let sentLength = 0
        let reuseToolRoundText = false

        if (toolsEnabled && user) {
          controller.enqueue(
            encode({ type: 'status', status: 'Looking up your marks…' })
          )

          // Two bounds on the loop, both per turn: at most MAX_TOOL_ROUNDS
          // model↔tool exchanges, and at most MAX_TOOL_RESULT_CHARS of tool
          // output in total (see lib/omni-ai/tool-budget.ts). The listing
          // tool returns excerpts; the detail tool returns one attempt.
          const budget = createToolBudget()

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const toolResponse = await generateGeminiWithContents(contents, {
              task: 'chat',
              system: systemPrompt,
              maxOutputTokens: 1500,
              // Chat answers shouldn't burn the output budget on hidden thinking.
              thinkingBudget: 0,
              tools: OMNI_MARKING_TOOLS,
            })

            const toolUses = toolResponse.functionCalls ?? []
            if (toolUses.length === 0) {
              // Model answered without tools — reuse that text instead of a
              // second full generation (the old double-generate lag).
              const direct = toolResponse.text?.trim() ?? ''
              if (direct) {
                fullText = direct
                reuseToolRoundText = true
              }
              break
            }

            controller.enqueue(
              encode({ type: 'status', status: 'Looking up your marks…' })
            )

            const modelParts = toolResponse.candidates?.[0]?.content?.parts
            if (modelParts?.length) {
              contents.push({ role: 'model', parts: modelParts })
            }

            const functionResponseParts: Part[] = []
            for (const call of toolUses) {
              const name = call.name ?? 'unknown'
              const args = (call.args || {}) as Record<string, unknown>
              let payload: ToolPayload

              if (name === 'fetch_recent_attempts') {
                const { attempts, note, error } = await fetchRecentAttemptsForUser(
                  supabaseService,
                  user.id,
                  {
                    subject_code:
                      typeof args.subject_code === 'string'
                        ? args.subject_code
                        : undefined,
                    topic_code:
                      typeof args.topic_code === 'string'
                        ? args.topic_code
                        : undefined,
                    limit: typeof args.limit === 'number' ? args.limit : undefined,
                  }
                )
                payload = error ? { error, attempts: [] } : { attempts, note }
              } else if (name === 'fetch_attempt_detail') {
                // Owner-checked inside: an id that is not this student's
                // comes back as "not found", never as someone else's work.
                payload = await fetchAttemptDetailForUser(
                  supabaseService,
                  user.id,
                  args.attempt_id
                )
              } else {
                payload = { error: 'Unknown tool' }
              }

              functionResponseParts.push({
                functionResponse: {
                  name,
                  response: chargeToolResult(budget, payload),
                },
              })
            }

            contents.push({ role: 'user', parts: functionResponseParts })
          }
        }

        if (reuseToolRoundText) {
          const displayText = stripPartialActionTail(fullText)
          if (displayText) {
            controller.enqueue(
              encode({ type: 'chunk', content: displayText })
            )
            sentLength = displayText.length
          }
        } else {
          for await (const chunk of streamGeminiWithContents(contents, {
            task: 'chat',
            system: systemPrompt,
            maxOutputTokens: 1500,
            thinkingBudget: 0,
          })) {
            fullText += chunk

            const displayText = stripPartialActionTail(fullText)
            const delta = displayText.slice(sentLength)
            if (delta) {
              controller.enqueue(encode({ type: 'chunk', content: delta }))
              sentLength = displayText.length
            }
          }
        }

        // extractActionFromText enforces the CTA href allowlist: a
        // render_cta whose href is not a same-origin path comes back as
        // `type: 'none'` and renders nothing.
        const { cleanText, action: rawAction } = extractActionFromText(fullText)
        let action = rawAction

        if (action) {
          action = await hydrateOmniAction(action, query, supabaseAdmin)
        }

        const finalDisplay = stripPartialActionTail(cleanText)
        const remainder = finalDisplay.slice(sentLength)
        if (remainder) {
          controller.enqueue(encode({ type: 'chunk', content: remainder }))
        }

        controller.enqueue(
          encode({ type: 'done', cleanText: finalDisplay, action })
        )

        controller.close()
      } catch (error) {
        console.error('Omni-AI stream error:', error)
        controller.enqueue(
          encode({ type: 'error', error: 'Stream failed. Please try again.' })
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
