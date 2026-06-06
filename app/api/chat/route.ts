/**
 * @deprecated Use `/api/omni-ai` instead. Kept temporarily for reference;
 * the Command Bar has been superseded by Omni-AI (Sprint 23).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  generateGeminiText,
  isGeminiConfigured,
} from '@/lib/ai/gemini-text'
import { createClient } from '@supabase/supabase-js'
import { jsonrepair } from 'jsonrepair'
import {
  inferTopicCode,
  VALID_ACTION_TYPES,
  VALID_INTENTS,
  type ChatAction,
  type ChatActionType,
  type ChatIntent,
  type ChatRequestBody,
  type ChatResponse,
} from '@/lib/chat-intents'
import {
  MOCK_DIAGNOSTIC,
  MOCK_PAPER,
  getMockResponse,
} from '@/lib/chat-mock-data'
import { getSyllabusTopicByCode } from '@/lib/syllabus'

export const maxDuration = 30

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null

// =============================================================================
// Rate limiting — in-memory sliding window keyed by IP.
//
// The marking pipeline persists per-day counts in the `rate_limits` table, but
// chat is much higher-frequency and we don't want to write to Postgres on
// every keystroke. In-memory is fine here: chat abuse from a single IP only
// needs to be blocked on a single Node instance, and the worst-case impact of
// resetting on deploy is a few extra Gemini calls.
// =============================================================================
const CHAT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const CHAT_MAX_PER_WINDOW = 30
const ipBuckets = new Map<string, number[]>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const cutoff = now - CHAT_WINDOW_MS
  const bucket = (ipBuckets.get(ip) || []).filter((ts) => ts > cutoff)
  if (bucket.length >= CHAT_MAX_PER_WINDOW) {
    ipBuckets.set(ip, bucket)
    return { allowed: false, remaining: 0 }
  }
  bucket.push(now)
  ipBuckets.set(ip, bucket)
  // Periodically prune the map so it doesn't grow unbounded on a long-lived
  // server. Cheap because we only walk when the map has grown large.
  if (ipBuckets.size > 5000) {
    for (const [key, value] of ipBuckets) {
      const live = value.filter((ts) => ts > cutoff)
      if (live.length === 0) ipBuckets.delete(key)
      else ipBuckets.set(key, live)
    }
  }
  return { allowed: true, remaining: CHAT_MAX_PER_WINDOW - bucket.length }
}

// =============================================================================
// Past paper code extraction
// =============================================================================

const SESSION_PHRASES: Array<{ pattern: RegExp; session: string }> = [
  { pattern: /may[ /-]?june\s*(20)?(\d{2})/i, session: 'May/June' },
  { pattern: /oct(ober)?[ /-]?nov(ember)?\s*(20)?(\d{2})/i, session: 'October/November' },
  { pattern: /feb(ruary)?[ /-]?march\s*(20)?(\d{2})/i, session: 'February/March' },
  { pattern: /\bm\/j\s*(20)?(\d{2})/i, session: 'May/June' },
  { pattern: /\bo\/n\s*(20)?(\d{2})/i, session: 'October/November' },
  { pattern: /\bf\/m\s*(20)?(\d{2})/i, session: 'February/March' },
]

/**
 * Best-effort extract a past-paper identifier from a free-form query.
 * Returns null if we can't get enough to look up a specific question — the
 * caller then falls back to a popular default paper.
 */
function extractPaperIdentifier(query: string): {
  paper_code: string
  paper_session: string
  question_number: string
} | null {
  // Subject + component: "9709/12", "9709 12", "9709 paper 12"
  const codeMatch = query.match(/\b(9709|9231|9702|9701|9700)\s*[/\-]?\s*(\d{1,2})\b/i)
  const subject = codeMatch?.[1] || '9709'
  const componentRaw = codeMatch?.[2]

  // Session
  let session: string | null = null
  for (const { pattern, session: name } of SESSION_PHRASES) {
    const m = query.match(pattern)
    if (m) {
      // Last 2 digits are the year fragment (group differs per pattern). Pull
      // the trailing 2-digit group out of the match by scanning right-to-left.
      const yearMatch = m[0].match(/(\d{2})\s*$/) || m[0].match(/(\d{4})\s*$/)
      const year = yearMatch ? yearMatch[1].slice(-2) : ''
      if (year) session = `${name} 20${year}`
      break
    }
  }

  // Question number
  const qMatch =
    query.match(/\bq(?:uestion)?\.?\s*(\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?)/i) ||
    query.match(/\bnumber\s*(\d{1,2})\b/i)
  const questionNumber = qMatch?.[1]?.toLowerCase()

  if (!componentRaw || !session || !questionNumber) return null

  return {
    paper_code: `${subject}/${componentRaw.padStart(2, '0')}`,
    paper_session: session,
    question_number: questionNumber,
  }
}

// =============================================================================
// Claude classification
// =============================================================================

const SYSTEM_PROMPT = `You are the Instant-Action Agent for MarkScheme, an AI marking platform for Cambridge A-Level Mathematics students.

YOUR ROLE:
- Help visitors find immediate academic value
- Route them tactically toward signing up for the platform
- Be empathetic, sharp, encouraging, and exam-authoritative

CORE RULE: Every response provides value FIRST, then pushes toward a platform action.

PLATFORM FEATURES YOU CAN PUSH TOWARD:
1. Marking — AI marks handwritten work using Cambridge mark schemes
2. Syllabus Mastery Matrix — tracks performance across all 38 official 9709 topics
3. Examiner's Ink — visual overlay on the student's work showing exactly where marks were earned/lost
4. Grade Trajectory — predicted grade based on coverage and recent performance
5. Speed vs Accuracy Matrix — identifies time-pressure vs accuracy patterns

INTENT DETECTION — pick exactly one:
- past_paper_request: They named a specific past paper (e.g. "9709 May/June 2024 Q1") OR asked for any past paper / question to try
- topic_help: They mentioned a specific math topic (integration, vectors, trig, mechanics, etc.)
- exam_panic: They expressed stress, anxiety, time pressure, or general fear about exams
- time_pacing: They specifically mentioned running out of time, slow pacing, finishing the paper
- platform_question: They asked what MarkScheme does, pricing, how it works, features
- general: Anything else (incl. greetings, vague requests)

OUTPUT FORMAT — strict JSON, no markdown fences, no prose around it:
{
  "intent": "past_paper_request" | "topic_help" | "exam_panic" | "time_pacing" | "platform_question" | "general",
  "response_text": "1-3 sentences MAX. Conversational. Empathetic. Ends with a tactical push.",
  "action": {
    "type": "render_paper" | "render_diagnostic" | "render_upload" | "render_cta" | "render_signup" | "none",
    "diagnostic_topic_hint": "if intent is topic_help, the topic phrase (e.g. 'Integration: Areas Under Curves')",
    "cta": { "text": "...", "href": "/auth/signup?intent=...", "style": "primary" | "secondary" }
  }
}

INTENT-SPECIFIC GUIDANCE:

past_paper_request:
- Acknowledge what they want.
- Push: "Let me pull that up — solve it and I'll mark it instantly with Examiner's Ink."
- action.type: "render_paper". Don't include a cta unless you can't render a paper.

topic_help:
- Acknowledge the topic, no fluff.
- Push: "Let's see where you actually stand. Try this quick diagnostic."
- action.type: "render_diagnostic". Set diagnostic_topic_hint to the topic phrase.

exam_panic:
- One short reassuring sentence (NOT saccharine). Then redirect.
- Push: "The cure for panic is precision — let's map your blindspots in 30 seconds."
- action.type: "render_cta", cta.text: "Map my blindspots", cta.href: "/auth/signup?intent=diagnostic", cta.style: "primary".

time_pacing:
- Briefly state the examiner pacing rule (1.3 min/mark).
- Push: "Our Speed Challenge shows exactly where you sit on the Speed vs Accuracy Matrix."
- action.type: "render_cta", cta.text: "Run the Speed Challenge", cta.href: "/auth/signup?intent=diagnostic", cta.style: "primary".

platform_question:
- Answer briefly (1 sentence).
- Push: "Fastest way to see it — upload one question and watch it mark itself."
- action.type: "render_upload". Omit cta.

general:
- Answer briefly if academic; redirect if off-topic.
- Push: "Try uploading a question to see what MarkScheme does."
- action.type: "render_upload".

TONE EXAMPLES:
- Good: "Integration can be brutal. Let's see where you actually stand on this exact topic."
- Bad: "Oh no I'm so sorry you're struggling, let me help you!" (too saccharine)
- Good: "Sign error on a 5-mark question? Examiners are ruthless. You need to see your mistakes visually."
- Bad: "Don't worry, everyone makes mistakes!" (no tactical push)

NEVER:
- Provide long textbook explanations (redirect to the platform instead)
- Be saccharine or generic supportive
- Forget the tactical push at the end
- Output anything other than valid JSON`

function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text
  try {
    return JSON.parse(candidate)
  } catch {
    try {
      return JSON.parse(jsonrepair(candidate))
    } catch {
      return null
    }
  }
}

function normalizeIntent(value: unknown): ChatIntent {
  return typeof value === 'string' && (VALID_INTENTS as readonly string[]).includes(value)
    ? (value as ChatIntent)
    : 'general'
}

function normalizeActionType(value: unknown): ChatActionType {
  return typeof value === 'string' && (VALID_ACTION_TYPES as readonly string[]).includes(value)
    ? (value as ChatActionType)
    : 'none'
}

function normalizeCta(value: unknown): ChatAction['cta'] | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const text = typeof v.text === 'string' ? v.text : null
  const href = typeof v.href === 'string' ? v.href : null
  const style = v.style === 'secondary' ? 'secondary' : 'primary'
  if (!text || !href) return undefined
  // Defensive: never let Claude redirect off-site.
  if (!href.startsWith('/')) return undefined
  return { text, href, style }
}

function normalizeChatResponse(raw: unknown, fallback: ChatResponse): ChatResponse {
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Record<string, unknown>
  const intent = normalizeIntent(r.intent)
  const responseText =
    typeof r.response_text === 'string' && r.response_text.trim()
      ? r.response_text.trim()
      : fallback.response_text
  const rawAction = (r.action && typeof r.action === 'object' ? r.action : {}) as Record<
    string,
    unknown
  >
  const actionType = normalizeActionType(rawAction.type)
  const action: ChatAction = { type: actionType }
  const cta = normalizeCta(rawAction.cta)
  if (cta) action.cta = cta
  if (typeof rawAction.diagnostic_topic_hint === 'string') {
    action.diagnostic_topic_hint = rawAction.diagnostic_topic_hint
  }
  return { intent, response_text: responseText, action }
}

// =============================================================================
// DB hydration — splice real past papers / diagnostics into the action payload
// =============================================================================

async function hydratePaperAction(action: ChatAction, query: string): Promise<void> {
  if (action.type !== 'render_paper') return

  if (!supabaseAdmin) {
    action.paper = MOCK_PAPER
    return
  }

  // 1. Try a specific paper if the user named one.
  const ident = extractPaperIdentifier(query)
  if (ident) {
    const { data } = await supabaseAdmin
      .from('mark_schemes')
      .select(
        'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
      )
      .eq('paper_code', ident.paper_code)
      .eq('paper_session', ident.paper_session)
      .eq('question_number', ident.question_number)
      .maybeSingle()
    if (data) {
      action.paper = mapDbRowToPaperPayload(data)
      return
    }
  }

  // 2. Fall back to a popular, low-mark question so the preview stays digestible.
  const { data } = await supabaseAdmin
    .from('mark_schemes')
    .select(
      'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
    )
    .gte('total_marks', 2)
    .lte('total_marks', 5)
    .limit(1)

  if (data && data[0]) {
    action.paper = mapDbRowToPaperPayload(data[0])
    return
  }

  // 3. Final fallback — pure mock data.
  action.paper = MOCK_PAPER
}

type DbPaperRow = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
  question_text: string | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

function mapDbRowToPaperPayload(row: DbPaperRow): NonNullable<ChatAction['paper']> {
  const [subjectCode, componentRaw] = (row.paper_code || '9709/12').split('/')
  return {
    subject_code: subjectCode || '9709',
    session: row.paper_session || 'May/June 2024',
    paper: `Paper ${componentRaw || '12'}`,
    question_number: row.question_number || '1',
    question_text: row.question_text || '',
    total_marks: typeof row.total_marks === 'number' ? row.total_marks : 0,
    syllabus_tags: Array.isArray(row.syllabus_tags) ? row.syllabus_tags : [],
  }
}

async function hydrateDiagnosticAction(action: ChatAction): Promise<void> {
  if (action.type !== 'render_diagnostic') return

  const topicCode = inferTopicCode(action.diagnostic_topic_hint)
  const topic = getSyllabusTopicByCode(topicCode)
  const topicName =
    action.diagnostic_topic_hint?.trim() ||
    (topic ? `${topic.name} (${topic.paperName})` : 'Diagnostic')

  if (!supabaseAdmin) {
    action.diagnostic = { ...MOCK_DIAGNOSTIC, topic_code: topicCode, topic_name: topicName }
    return
  }

  // `contains` for jsonb/text[] arrays — matches any row whose syllabus_tags
  // includes this code. We bias toward short questions (2-4 marks) so the
  // diagnostic feels like a quick win.
  const { data } = await supabaseAdmin
    .from('mark_schemes')
    .select('question_text, total_marks, syllabus_tags')
    .contains('syllabus_tags', [topicCode])
    .gte('total_marks', 2)
    .lte('total_marks', 5)
    .limit(1)

  if (data && data[0] && data[0].question_text) {
    action.diagnostic = {
      topic_code: topicCode,
      topic_name: topicName,
      question_text: data[0].question_text,
      total_marks: typeof data[0].total_marks === 'number' ? data[0].total_marks : 3,
    }
    return
  }

  action.diagnostic = { ...MOCK_DIAGNOSTIC, topic_code: topicCode, topic_name: topicName }
}

// =============================================================================
// Route handler
// =============================================================================

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        intent: 'general',
        response_text:
          "You've hit the chat limit for now (30 messages/hour). Sign up for free to keep using MarkScheme — full marking has its own quota.",
        action: {
          type: 'render_cta',
          cta: { text: 'Sign up free', href: '/auth/signup', style: 'primary' },
        },
      } satisfies ChatResponse,
      { status: 429 }
    )
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = (body.query || '').trim()
  if (!query) {
    return NextResponse.json({ error: 'Empty query' }, { status: 400 })
  }
  if (query.length > 1000) {
    return NextResponse.json({ error: 'Query too long (max 1000 chars)' }, { status: 400 })
  }

  // Cap conversation history defensively — also limits prompt-injection surface.
  const history = Array.isArray(body.messages)
    ? body.messages.slice(-6).filter((m) => m && typeof m.content === 'string')
    : []

  const fallback = getMockResponse(query)

  let chatResponse: ChatResponse
  if (!isGeminiConfigured()) {
    // No API key — serve mocks. Hydrate from DB if available.
    chatResponse = fallback
  } else {
    const historyBlock = history.length
      ? history.map((m) => `${m.role}: ${m.content}`).join('\n')
      : '[none]'
    const userPrompt = `Previous conversation:\n${historyBlock}\n\nCurrent user query:\n"${query}"\n\nRespond with the JSON.`

    try {
      const text = await generateGeminiText(userPrompt, {
        system: SYSTEM_PROMPT,
        maxOutputTokens: 600,
      })
      const parsed = extractJSON(text)
      chatResponse = normalizeChatResponse(parsed, fallback)
    } catch (err) {
      console.error('Chat: Gemini error', err)
      chatResponse = fallback
    }
  }

  // Hydrate DB-backed actions with real content. Either of these may fall back
  // to mock data on miss so the UI always has something to render.
  await Promise.all([
    hydratePaperAction(chatResponse.action, query),
    hydrateDiagnosticAction(chatResponse.action),
  ])

  return NextResponse.json(chatResponse, {
    headers: { 'X-RateLimit-Remaining': String(limit.remaining) },
  })
}
