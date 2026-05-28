import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '@/lib/omni-ai/system-prompts'
import {
  extractActionFromText,
  stripPartialActionTail,
} from '@/lib/omni-ai/actions'
import {
  createSupabaseAdmin,
  hydrateOmniAction,
} from '@/lib/omni-ai/hydrate-actions'
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

  const systemPrompt = buildSystemPrompt(context)
  const supabase = createSupabaseAdmin()

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

        const anthropicMessages = [
          ...history.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content: query },
        ]

        const messageStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          messages: anthropicMessages,
        })

        let fullText = ''
        let sentLength = 0

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text

            // Stream only the "clean" portion — hide partial [[ACTION:...]] tails.
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
          action = await hydrateOmniAction(action, query, supabase)
        }

        // Send any remaining clean text not yet streamed.
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
