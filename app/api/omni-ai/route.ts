import { NextRequest } from 'next/server'
import type { Content } from '@google/genai'
import {
  generateGeminiWithContents,
  isGeminiConfigured,
  streamGeminiWithContents,
  toGeminiContents,
} from '@/lib/ai/gemini-text'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildSystemPrompt } from '@/lib/omni-ai/system-prompts'
import {
  extractActionFromText,
  stripPartialActionTail,
} from '@/lib/omni-ai/actions'
import {
  createSupabaseAdmin,
  hydrateOmniAction,
} from '@/lib/omni-ai/hydrate-actions'
import {
  fetchRecentAttemptsForUser,
  formatAttemptForPrompt,
  loadAttemptForOmni,
} from '@/lib/omni-ai/marking-context'
import { OMNI_MARKING_TOOLS } from '@/lib/omni-ai/marking-tools'
import type { AIContextType, OmniAIRequestBody } from '@/lib/omni-ai/types'
import {
  checkOmniAllowance,
  omniQuotaExceededBody,
  recordOmniUsage,
} from '@/lib/billing/enforcement'
import { hourlyRateLimitHeaders } from '@/lib/http/rate-limit-response'

export const maxDuration = 60

const OMNI_WINDOW_MS = 60 * 60 * 1000
const OMNI_MAX_PER_WINDOW = 40
const ipBuckets = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - OMNI_WINDOW_MS
  const bucket = (ipBuckets.get(ip) || []).filter((ts) => ts > cutoff)
  if (bucket.length >= OMNI_MAX_PER_WINDOW) {
    ipBuckets.set(ip, bucket)
    return false
  }
  bucket.push(now)
  ipBuckets.set(ip, bucket)
  return true
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  if (!checkRateLimit(ip)) {
    return new Response(
      sse({
        type: 'error',
        error: 'Rate limit reached (40 messages/hour). Try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          ...hourlyRateLimitHeaders(),
        },
      }
    )
  }

  let body: OmniAIRequestBody
  try {
    body = (await req.json()) as OmniAIRequestBody
  } catch {
    return new Response(sse({ type: 'error', error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const query = (body.query || '').trim()
  if (!query) {
    return new Response(sse({ type: 'error', error: 'Empty query' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const context = (body.context || { type: 'landing' }) as AIContextType
  const history = Array.isArray(body.messages)
    ? body.messages
        .slice(-8)
        .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    : []

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  const supabaseAdmin = createSupabaseAdmin()
  const supabaseService = createServiceClient()
  const attemptIdFromBody = body.attemptId?.trim()
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

  const markingAwareness = !!user && context.type !== 'teacher_dashboard'

  // Landing demo chat stays unrestricted; in-app Omni is metered for signed-in users.
  if (user && context.type !== 'landing') {
    const omniAllowance = await checkOmniAllowance(user.id)
    if (omniAllowance.blocked_by_mode) {
      const body = omniQuotaExceededBody(omniAllowance)
      return new Response(
        sse({
          type: 'error',
          message:
            'You\'ve used all your study chat messages this month. Upgrade or top up credits to continue.',
          code: body.error,
          tier: body.tier,
          cap: body.cap,
          period_resets_at: body.period_resets_at,
          credit_balance: body.credit_balance,
          upgrade_url: body.upgrade_url,
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
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
  }

  const systemPrompt = buildSystemPrompt(context, {
    markingAwareness,
    focusedAttemptBlock,
  })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!isGeminiConfigured()) {
          controller.enqueue(
            new TextEncoder().encode(
              sse({
                type: 'done',
                cleanText:
                  'Omni-AI is not configured. Set USE_VERTEX_AI + GOOGLE_CLOUD_PROJECT, or GEMINI_API_KEY. See docs/vertex-ai-migration.md',
                action: { type: 'render_upload' },
              })
            )
          )
          controller.close()
          return
        }

        const contents: Content[] = [
          ...toGeminiContents(
            history.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
          ),
          { role: 'user', parts: [{ text: query }] },
        ]

        const toolsEnabled = markingAwareness

        if (toolsEnabled) {
          for (let round = 0; round < 3; round++) {
            const toolResponse = await generateGeminiWithContents(contents, {
              task: 'chat',
              system: systemPrompt,
              maxOutputTokens: 1500,
              tools: OMNI_MARKING_TOOLS,
            })

            const toolUses = toolResponse.functionCalls ?? []
            if (toolUses.length === 0) break
            if (!user) break

            const modelParts = toolResponse.candidates?.[0]?.content?.parts
            if (modelParts?.length) {
              contents.push({ role: 'model', parts: modelParts })
            }

            const functionResponseParts = []
            for (const call of toolUses) {
              if (call.name === 'fetch_recent_attempts') {
                const input = (call.args || {}) as {
                  subject_code?: string
                  topic_code?: string
                  limit?: number
                }
                const { attempts, error } = await fetchRecentAttemptsForUser(
                  supabaseService,
                  user.id,
                  input
                )
                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: error
                      ? { error, attempts: [] }
                      : { attempts },
                  },
                })
              } else {
                functionResponseParts.push({
                  functionResponse: {
                    name: call.name ?? 'unknown',
                    response: { error: 'Unknown tool' },
                  },
                })
              }
            }

            contents.push({ role: 'user', parts: functionResponseParts })
          }
        }

        let fullText = ''
        let sentLength = 0

        for await (const chunk of streamGeminiWithContents(contents, {
          task: 'chat',
          system: systemPrompt,
          maxOutputTokens: 1500,
        })) {
          fullText += chunk

          const displayText = stripPartialActionTail(fullText)
          const delta = displayText.slice(sentLength)
          if (delta) {
            controller.enqueue(
              new TextEncoder().encode(sse({ type: 'chunk', content: delta }))
            )
            sentLength = displayText.length
          }
        }

        const { cleanText, action: rawAction } = extractActionFromText(fullText)
        let action = rawAction

        if (action) {
          action = await hydrateOmniAction(action, query, supabaseAdmin)
        }

        const finalDisplay = stripPartialActionTail(cleanText)
        const remainder = finalDisplay.slice(sentLength)
        if (remainder) {
          controller.enqueue(
            new TextEncoder().encode(sse({ type: 'chunk', content: remainder }))
          )
        }

        controller.enqueue(
          new TextEncoder().encode(
            sse({ type: 'done', cleanText: finalDisplay, action })
          )
        )

        controller.close()
      } catch (error) {
        console.error('Omni-AI stream error:', error)
        controller.enqueue(
          new TextEncoder().encode(
            sse({ type: 'error', error: 'Stream failed. Please try again.' })
          )
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
