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
import { hourlyRateLimitHeaders } from '@/lib/http/rate-limit-response'

export const maxDuration = 30

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 30
const buckets = new Map<string, number[]>()

function allow(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const bucket = (buckets.get(ip) || []).filter((ts) => ts > cutoff)
  if (bucket.length >= MAX_PER_WINDOW) {
    buckets.set(ip, bucket)
    return false
  }
  bucket.push(now)
  buckets.set(ip, bucket)
  return true
}

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

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  if (!allow(ip)) {
    return NextResponse.json(
      { error: 'Too many teach-backs this hour. Try again shortly.' },
      { status: 429, headers: hourlyRateLimitHeaders(3600) }
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

  const takeaways = extractKeyTakeaways(lesson)
  const brief = lessonBriefFromParts({
    title: lesson.title,
    summary: lesson.summary,
    simpleSummary: lesson.simpleExplanation?.summary,
    steps: lesson.simpleExplanation?.steps,
    objectives: lesson.learningObjectives,
    takeaways,
  })

  const { system, user } = buildTeachBackPrompt({
    title: lesson.title,
    topicCode: lesson.topicCode,
    lessonBrief: brief,
    explanation,
  })

  try {
    let result = await runTeachBack({ system, user, temperature: 0.2 })
    // Full re-ask (with the lesson + student text), not a blind JSON "repair"
    // that invents commentary about missing fields.
    if (!result) {
      result = await runTeachBack({
        system: `${system} Emit one complete JSON object only. Judge the student explanation against the lesson brief — never mention JSON or fields.`,
        user,
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
