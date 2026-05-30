import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
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

export const maxDuration = 60

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null

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

type AnthropicMessage = Anthropic.MessageParam

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
  const systemPrompt = buildSystemPrompt(context, {
    markingAwareness,
    focusedAttemptBlock,
  })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!anthropic) {
          controller.enqueue(
            new TextEncoder().encode(
              sse({
                type: 'done',
                cleanText:
                  'Omni-AI is not configured (missing API key). Add ANTHROPIC_API_KEY to enable streaming responses.',
                action: { type: 'render_upload' },
              })
            )
          )
          controller.close()
          return
        }

        const anthropicMessages: AnthropicMessage[] = [
          ...history.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: query },
        ]

        const toolsEnabled = markingAwareness
        let messagesForStream = anthropicMessages

        if (toolsEnabled) {
          for (let round = 0; round < 3; round++) {
            const toolResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1500,
              system: systemPrompt,
              messages: messagesForStream,
              tools: OMNI_MARKING_TOOLS,
            })

            const toolUses = toolResponse.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )

            if (toolUses.length === 0) {
              break
            }

            if (!user) {
              break
            }

            messagesForStream = [
              ...messagesForStream,
              { role: 'assistant', content: toolResponse.content },
            ]

            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const tu of toolUses) {
              if (tu.name === 'fetch_recent_attempts') {
                const input = (tu.input || {}) as {
                  subject_code?: string
                  topic_code?: string
                  limit?: number
                }
                const { attempts, error } = await fetchRecentAttemptsForUser(
                  supabaseService,
                  user.id,
                  input
                )
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  content: JSON.stringify(
                    error ? { error, attempts: [] } : { attempts }
                  ),
                })
              } else {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  content: JSON.stringify({ error: 'Unknown tool' }),
                  is_error: true,
                })
              }
            }

            messagesForStream = [
              ...messagesForStream,
              { role: 'user', content: toolResults },
            ]
          }
        }

        const messageStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          messages: messagesForStream,
        })

        let fullText = ''
        let sentLength = 0

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text

            const displayText = stripPartialActionTail(fullText)
            const delta = displayText.slice(sentLength)
            if (delta) {
              controller.enqueue(
                new TextEncoder().encode(sse({ type: 'chunk', content: delta }))
              )
              sentLength = displayText.length
            }
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
