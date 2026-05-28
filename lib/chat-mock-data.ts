/**
 * Fallback responses for the Instant-Action Agent.
 *
 * Two roles:
 *   1. When `ANTHROPIC_API_KEY` is unset (local dev without secrets) or the
 *      Claude call throws, the chat API returns the best matching mock so the
 *      widget keeps working end-to-end.
 *   2. When Claude returns an action that needs DB-backed content (a past
 *      paper, a diagnostic question) but the DB lookup misses, we splice the
 *      mock payload into the action so the UI still has something to render.
 *
 * All entries are real Cambridge 9709 phrasing so the demo feels authentic.
 */

import type { ChatIntent, ChatResponse } from './chat-intents'

export const MOCK_PAPER = {
  subject_code: '9709',
  session: 'May/June 2024',
  paper: 'Paper 12',
  question_number: '1',
  question_text:
    'The coefficient of $x^2$ in the expansion of $(2 + ax)^6$ is 240. Find the value of the positive constant $a$.',
  total_marks: 3,
  syllabus_tags: ['1.6'],
}

export const MOCK_DIAGNOSTIC = {
  topic_code: '1.8',
  topic_name: 'Integration: Areas Under Curves',
  question_text:
    'Find the area of the region enclosed between the curve $y = x^2 - 4$ and the x-axis.',
  total_marks: 3,
}

/**
 * Keyword-driven fallback. We pick the first matcher whose regex hits the
 * query. Order matters: more specific phrases first so e.g. "running out of
 * time" doesn't get swallowed by the generic "time" matcher.
 */
const MOCK_MATCHERS: Array<{
  pattern: RegExp
  response: ChatResponse
}> = [
  // Past paper — explicit code like "9709 May/June 2024 Q1" or just "past paper"
  {
    pattern:
      /\b(9709|9231|past paper|may[ /-]?june|oct[ /-]?nov|specimen|paper \d|q\d|question \d)\b/i,
    response: {
      intent: 'past_paper_request',
      response_text:
        "Got it — let me pull that question up. Solve it on paper, snap a photo, and I'll mark it with Examiner's Ink so you can see exactly where every mark lands.",
      action: {
        type: 'render_paper',
        paper: MOCK_PAPER,
      },
    },
  },
  // Topic help — math topics
  {
    pattern:
      /\b(integration|differentiation|vectors?|mechanics|kinematics|trig|trigonometry|quadratic|probability|normal distribution|series|binomial|circular measure|functions?|complex numbers?)\b/i,
    response: {
      intent: 'topic_help',
      response_text:
        "Topics live or die on whether you can actually do the question, not just recognise it. Here's a quick diagnostic — try it, then upload your attempt to see exactly where you stand.",
      action: {
        type: 'render_diagnostic',
        diagnostic: MOCK_DIAGNOSTIC,
      },
    },
  },
  // Exam panic
  {
    pattern:
      /\b(stress|panic|anxious|anxiety|scared|worried|overwhelm|freak|nervous|fail|behind)\b/i,
    response: {
      intent: 'exam_panic',
      response_text:
        "Panic usually means you don't know where your blindspots are — so they all feel equally scary. Let's map them. Take our 30-second diagnostic and we'll tell you exactly which topics to hit first.",
      action: {
        type: 'render_cta',
        cta: {
          text: 'Map my blindspots',
          href: '/auth/signup?intent=diagnostic',
          style: 'primary',
        },
      },
    },
  },
  // Time pacing
  {
    pattern:
      /\b(time|pacing|slow|finish|rush|out of time|running out|too long|minutes)\b/i,
    response: {
      intent: 'time_pacing',
      response_text:
        "Cambridge examiners pace at roughly 1.3 minutes per mark — a 9-mark question is a 12-minute job, no more. Our Speed Challenge shows exactly where you sit on the Speed vs Accuracy Matrix.",
      action: {
        type: 'render_cta',
        cta: {
          text: 'Run the Speed Challenge',
          href: '/auth/signup?intent=diagnostic',
          style: 'primary',
        },
      },
    },
  },
  // Platform questions
  {
    pattern:
      /\b(what.*(examcore|this|platform|do)|how does this|how it works|pricing|free|cost|features?)\b/i,
    response: {
      intent: 'platform_question',
      response_text:
        "Fastest way to see what Examcore does: upload a single handwritten question and watch it mark itself in 30 seconds.",
      action: { type: 'render_upload' },
    },
  },
  // Mark request — explicit upload
  {
    pattern: /\b(mark|grade|check|upload|photo|picture|camera)\b/i,
    response: {
      intent: 'general',
      response_text:
        "Snap a photo of your handwritten working and I'll mark it like a real examiner — B1, M1, A1 with margin notes.",
      action: { type: 'render_upload' },
    },
  },
]

export const MOCK_GREETING: ChatResponse = {
  intent: 'general',
  response_text:
    "Hey — I'm here to help. Got a past paper question, a topic you're stuck on, or just want to see how Examcore works?",
  action: { type: 'render_upload' },
}

export function getMockResponse(query: string): ChatResponse {
  const q = query.trim()
  if (q.length === 0) return MOCK_GREETING
  for (const matcher of MOCK_MATCHERS) {
    if (matcher.pattern.test(q)) {
      // Clone so callers can mutate (e.g. splice in DB data) safely.
      return JSON.parse(JSON.stringify(matcher.response))
    }
  }
  return {
    intent: 'general',
    response_text:
      "Happy to help. The fastest way to see what Examcore can do is to upload a single question — I'll mark it instantly.",
    action: { type: 'render_upload' },
  }
}
