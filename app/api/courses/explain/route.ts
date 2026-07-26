import { NextRequest } from 'next/server'
import { getCourseLesson, getCourseSubject } from '@/lib/courses'
import { extractNotes } from '@/lib/courses/margin-notes/adapt-lesson'
import { lessonBlockKey, isExplainIntent } from '@/lib/courses/explain-block-key'
import {
  buildExplainSystemPrompt,
  buildExplainUserPrompt,
} from '@/lib/courses/explain-prompt'
import { getSubtopicsForLesson } from '@/lib/courses/syllabus-outcomes'
import {
  isGeminiConfigured,
  streamGeminiWithContents,
  toGeminiContents,
} from '@/lib/ai/gemini-text'
import { modelForTask } from '@/lib/ai/gemini-models'
import { createServiceClient } from '@/lib/supabase-server'
import { hourlyRateLimitHeaders } from '@/lib/http/rate-limit-response'

/**
 * Per-paragraph "Explain more" for course lessons.
 *
 * Deliberately NOT an Omni-AI chat context. The output is deterministic per
 * (lesson_slug, block_key, intent) and identical for every student who reads
 * that paragraph, so it is cached shared content, not a per-user conversation:
 * a cache hit costs no quota and no model time. See
 * docs/course-explain-more.md.
 *
 * The client never supplies the text to explain — only a block key. The
 * paragraph is resolved from the on-disk lesson, so nothing a caller sends can
 * end up as the body of a row we serve publicly.
 */

export const maxDuration = 30

const MISS_WINDOW_MS = 60 * 60 * 1000
/** Generous, because cache hits never reach this — only cold paragraphs do. */
const MISS_MAX_PER_WINDOW = 20
const missBuckets = new Map<string, number[]>()

function allowMiss(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - MISS_WINDOW_MS
  const bucket = (missBuckets.get(ip) || []).filter((ts) => ts > cutoff)
  if (bucket.length >= MISS_MAX_PER_WINDOW) {
    missBuckets.set(ip, bucket)
    return false
  }
  bucket.push(now)
  missBuckets.set(ip, bucket)
  return true
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

function sseError(error: string, status: number, extra?: HeadersInit): Response {
  return new Response(sse({ type: 'error', error }), {
    status,
    headers: { ...SSE_HEADERS, ...extra },
  })
}

type ExplainRequestBody = {
  subjectCode?: string
  lessonSlug?: string
  blockKey?: string
  intent?: string
}

/**
 * The two IB lesson routes disagree about what `subjectCode` means.
 *
 * `/ib/courses/<slug>` — the canonical, sitemapped route — passes the catalog
 * slug, which `getIbCourseSlugs()` produces by stripping the `ib-` prefix
 * ("history-hl"). The legacy `/courses/ib-<subject>` alias passes the content
 * directory name ("ib-history-hl"). Lesson content only ever lives under the
 * prefixed name.
 *
 * Left unresolved this broke IB lessons two ways: `getCourseLesson()` missed
 * entirely (404 on every canonical IB page), and `isIbCourseCode()` — which
 * tests for the `ib-` prefix — would have reported an IB lesson as Cambridge and
 * prompted the model for B1/M1/A1 marks on a markband subject.
 *
 * Returns the canonical content code so everything downstream (prompt, board
 * detection, cached `subject_code`) agrees regardless of which route called.
 */
function resolveLesson(subjectCode: string, lessonSlug: string) {
  const direct = getCourseLesson(subjectCode, lessonSlug)
  if (direct) return { code: subjectCode, lesson: direct }
  if (subjectCode.startsWith('ib-')) return null
  const prefixed = `ib-${subjectCode}`
  const viaPrefix = getCourseLesson(prefixed, lessonSlug)
  return viaPrefix ? { code: prefixed, lesson: viaPrefix } : null
}

export async function POST(req: NextRequest) {
  let body: ExplainRequestBody
  try {
    body = (await req.json()) as ExplainRequestBody
  } catch {
    return sseError('Invalid JSON body', 400)
  }

  const subjectCode = (body.subjectCode || '').trim()
  const lessonSlug = (body.lessonSlug || '').trim()
  const blockKey = (body.blockKey || '').trim()
  const intent = body.intent

  if (!subjectCode || !lessonSlug || !blockKey) {
    return sseError('Missing subjectCode, lessonSlug or blockKey', 400)
  }
  if (!isExplainIntent(intent)) {
    return sseError('Unknown intent', 400)
  }

  const supabase = createServiceClient()

  const { data: cached } = await supabase
    .from('lesson_explanations')
    .select('body')
    .eq('lesson_slug', lessonSlug)
    .eq('block_key', blockKey)
    .eq('intent', intent)
    .maybeSingle()

  if (cached?.body) {
    // Counted before returning: this is the signal that tells us which
    // paragraphs the catalogue explains worst, so it must not be best-effort.
    await supabase.rpc('bump_lesson_explanation_demand', {
      p_lesson_slug: lessonSlug,
      p_block_key: blockKey,
      p_intent: intent,
    })
    return new Response(sse({ type: 'done', body: cached.body, cached: true }), {
      headers: SSE_HEADERS,
    })
  }

  // --- cache miss: everything below costs money, so validate hard first ---

  const resolved = resolveLesson(subjectCode, lessonSlug)
  if (!resolved) return sseError('Unknown lesson', 404)
  const { code: contentCode, lesson } = resolved

  const block = extractNotes(lesson.sections).find(
    (note) => lessonBlockKey(note) === blockKey
  )
  if (!block) {
    // Stale client after a content regen, or a fabricated key. Either way we
    // have no paragraph to explain and will not invent one.
    return sseError('Unknown block for this lesson', 404)
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  if (!allowMiss(ip)) {
    return sseError(
      'Too many new explanations requested this hour. Try again later.',
      429,
      hourlyRateLimitHeaders()
    )
  }

  if (!isGeminiConfigured()) {
    return sseError('Explanations are not configured on this environment', 503)
  }

  const subjectName = getCourseSubject(contentCode)?.name ?? contentCode
  const objectives = [
    ...(lesson.learningObjectives ?? []),
    ...getSubtopicsForLesson(contentCode, lesson.topicCode).map((s) => s.title),
  ]

  const system = buildExplainSystemPrompt({
    subjectCode: contentCode,
    subjectName,
    lessonTitle: lesson.title,
    topicCode: lesson.topicCode,
    block,
    objectives,
    intent,
  })
  const model = modelForTask('explain-block')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let full = ''
      try {
        const chunks = streamGeminiWithContents(
          toGeminiContents([{ role: 'user', content: buildExplainUserPrompt(block) }]),
          {
            task: 'explain-block',
            system,
            temperature: 0.4,
            maxOutputTokens: 1200,
            // Thinking tokens come out of maxOutputTokens. This is a short,
            // heavily-constrained rewrite of text we supply, so the default
            // dynamic budget bought nothing and truncated the answer mid-word.
            thinkingBudget: 0,
          }
        )
        for await (const text of chunks) {
          full += text
          controller.enqueue(encoder.encode(sse({ type: 'delta', text })))
        }

        const finalBody = full.trim()
        if (!finalBody) {
          controller.enqueue(
            encoder.encode(sse({ type: 'error', error: 'Empty explanation' }))
          )
          controller.close()
          return
        }

        // Only a cleanly finished stream is cached — a truncated body would be
        // served to every future reader of this paragraph.
        const { error } = await supabase.from('lesson_explanations').upsert(
          {
            subject_code: contentCode,
            lesson_slug: lessonSlug,
            block_key: blockKey,
            intent,
            body: finalBody,
            model,
            request_count: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lesson_slug,block_key,intent' }
        )
        if (error) {
          // The student still gets their explanation; only the cache lost.
          console.error('[courses/explain] cache write failed:', error)
        }

        controller.enqueue(
          encoder.encode(sse({ type: 'done', body: finalBody, cached: false }))
        )
        controller.close()
      } catch (err) {
        console.error('[courses/explain] generation failed:', err)
        controller.enqueue(
          encoder.encode(
            sse({ type: 'error', error: 'Could not generate an explanation. Try again.' })
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
