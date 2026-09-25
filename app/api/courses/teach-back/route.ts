import { NextRequest, NextResponse } from 'next/server'
import { contentSubjectCode } from '@/lib/courses/board'
import { getCourseLesson } from '@/lib/courses'
import { extractKeyTakeaways } from '@/lib/courses/lesson-toc-helpers'
import {
  buildTeachBackPrompt,
  clampTeachBackExplanation,
  isPlausibleTeachBackResult,
  lessonBriefFromParts,
  salvageTeachBackResponse,
  type TeachBackResult,
} from '@/lib/courses/teach-back'
import {
  generateGeminiText,
  isGeminiConfigured,
} from '@/lib/ai/gemini-text'
import {
  authenticateRouteRequest,
  createServiceClient,
} from '@/lib/supabase-server'
import {
  clientIp,
  consumeTeachBackSlot,
  RateLimitUnavailableError,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'

export const maxDuration = 30

type Body = {
  subjectCode?: string
  lessonSlug?: string
  explanation?: string
}

async function runTeachBack(args: {
  system: string
  user: string
  temperature: number
}): Promise<TeachBackResult | null> {
  const raw = await generateGeminiText(args.user, {
    task: 'teach-back',
    system: args.system,
    temperature: args.temperature,
    // Flash often truncates mid-JSON at ~700; leave headroom for gaps.
    maxOutputTokens: 2048,
  })
  const parsed = salvageTeachBackResponse(raw)
  if (!parsed || !isPlausibleTeachBackResult(parsed)) {
    if (raw.trim()) {
      console.error('[courses/teach-back] bad output', raw.slice(0, 400))
    }
    return null
  }
  return parsed
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subjectCode = (body.subjectCode || '').trim()
  const lessonSlug = (body.lessonSlug || '').trim()
  const explanation = clampTeachBackExplanation(body.explanation || '')

  if (!subjectCode || !lessonSlug) {
    return NextResponse.json({ error: 'Missing lesson' }, { status: 400 })
  }
  if (explanation.length < 24) {
    return NextResponse.json(
      { error: 'Write a little more — a few sentences in your own words.' },
      { status: 400 }
    )
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

  const code = contentSubjectCode(subjectCode)
  const lesson = getCourseLesson(code, lessonSlug)
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Persisted daily cap — per user when signed in, per IP for a guest.
  //
  // This route is unauthenticated and every hit is up to two Pro-class calls
  // with no cache. It was guarded by an in-process Map, which on Vercel is
  // per-lambda and empty after every cold start, so the "30 an hour" it
  // promised was closer to "30 per instance, and a new instance is free".
  // (Code review 2026-09-25, §1.7.) Consumed only after the lesson resolves,
  // so a typo in the slug does not spend a slot.
  const { user } = await authenticateRouteRequest(req)
  const ip = clientIp(req)
  try {
    const slot = await consumeTeachBackSlot(createServiceClient(), ip, user?.id ?? null)
    if (!slot.allowed) {
      return rateLimitJson(slot.message)
    }
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { error: 'Teach-back is briefly unavailable. Try again in a minute.' },
        { status: 503 }
      )
    }
    throw err
  }

  const takeaways = extractKeyTakeaways(lesson)
  const brief = lessonBriefFromParts({
    title: lesson.title,
    summary: lesson.summary,
    simpleSummary: lesson.simpleExplanation?.summary,
    steps: lesson.simpleExplanation?.steps,
    objectives: lesson.learningObjectives,
    takeaways,
  })

  const { system, user: userPrompt } = buildTeachBackPrompt({
    title: lesson.title,
    topicCode: lesson.topicCode,
    lessonBrief: brief,
    explanation,
  })

  try {
    let result = await runTeachBack({ system, user: userPrompt, temperature: 0.2 })
    // Full re-ask (with the lesson + student text), not a blind JSON "repair"
    // that invents commentary about missing fields.
    if (!result) {
      result = await runTeachBack({
        system: `${system} Emit one complete JSON object only. Judge the student explanation against the lesson brief — never mention JSON or fields.`,
        user: userPrompt,
        temperature: 0,
      })
    }
    if (!result) {
      return NextResponse.json(
        { error: 'Could not read the gap check. Try once more.' },
        { status: 502 }
      )
    }
    return NextResponse.json({
      title: lesson.title,
      ...result,
    })
  } catch (err) {
    console.error('[courses/teach-back]', err)
    return NextResponse.json({ error: 'Teach-back failed' }, { status: 502 })
  }
}
