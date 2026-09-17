/**
 * No scheme text leaves the server.
 *
 * The roadmap's copy is templates and numbers. A student's marked attempts
 * carry question text and the marker's sentences; neither may appear in a
 * task label, objective or explanation, in a notification, or in the
 * check-in email — those surfaces are read on phones, forwarded, and
 * printed. This test feeds the builders attempts whose strings are
 * unmistakable and asserts that none of them come back out, and that every
 * explanation fits the sheet.
 *
 * Runs with --conditions=react-server (the email module sits behind
 * server-only). When the scheduler's buildRoadmap is present the plan
 * comes from it; otherwise a hand-built v3 plan stands in.
 */

import assert from 'node:assert/strict'
import { NOTIFICATION_COPY } from '@/lib/plan/notification-policy'
import { renderPlanCheckinEmail } from '@/lib/email/plan-checkin'
import { normaliseRoadmap } from '@/lib/plan/roadmap-view'
import type { HydratedPlan } from '@/lib/plan/plan-view'
import {
  EVIDENCE_EXPLANATION_MAX,
  FORBIDDEN_NUDGE_WORDS,
  type RoadmapNotificationKind,
  type TopicSignals,
} from '@/lib/plan/roadmap-types'

// --- the strings that must never come back ---
const QUESTION_TEXT = 'Zebrafish Q7 find dy/dx of x^3 sin x and hence the stationary points on [0, pi]'
const MARKER_FEEDBACK = 'Candidate dropped the minus sign at the M1 step and never recovered the A1 mark'
const OCR_TEXT = 'ocr-fragment-9931 the student wrote 3x^2 cos x'
const SECRETS = [QUESTION_TEXT, MARKER_FEEDBACK, OCR_TEXT, 'Zebrafish', 'ocr-fragment-9931', 'dropped the minus sign']

const attempts = [
  {
    id: 'a1',
    marks_earned: 2,
    total_marks: 6,
    syllabus_tags: ['1.7'],
    created_at: '2026-09-15T10:00:00Z',
    question_text: QUESTION_TEXT,
    ocr_text: OCR_TEXT,
    error_classifications: [{ classification: 'algebraic_sign', mark_id: 'M1', description: MARKER_FEEDBACK }],
    mark_schemes: { paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '7' },
  },
]

// Signals with ordinary names; the attempt above is the only data behind them.
const signals: TopicSignals[] = [
  { code: '1.7', name: 'Differentiation', order: 6, coreWeight: 1, mastery: { percentage: 33, attempts: 1, lastAt: attempts[0]!.created_at }, errorTags: ['algebraic_sign'], prerequisiteOf: ['1.8'] },
  { code: '1.8', name: 'Integration', order: 7, coreWeight: 1, prerequisiteOf: [] },
  { code: '1.5', name: 'Trigonometry', order: 4, coreWeight: 1, frequency: { papers: 8, of: 9, taggedShare: 0.9, scope: 'subject', from: 'May/June 2024', to: 'Oct/Nov 2025' }, prerequisiteOf: [] },
]

function leaks(text: string): string | null {
  const lower = text.toLowerCase()
  for (const s of SECRETS) if (lower.includes(s.toLowerCase())) return s
  return null
}

function assertClean(text: string, where: string) {
  const hit = leaks(text)
  assert.equal(hit, null, `${where} leaks "${hit}": ${text.slice(0, 120)}`)
}

// --- a v3 plan: from the scheduler when it is on disk, a fixture otherwise ---
async function buildPlan(): Promise<HydratedPlan> {
  const mod = (await import('@/lib/plan/build-study-plan')) as Record<string, unknown>
  const buildRoadmap = mod.buildRoadmap as ((input: unknown) => { plan: HydratedPlan }) | undefined
  if (typeof buildRoadmap === 'function') {
    const { plan } = buildRoadmap({
      startDate: '2026-09-17',
      examDate: '2026-10-10',
      mode: 'balanced',
      availabilityDetail: {
        weekdayMinutes: 90,
        weekendMinutes: 150,
        windows: { weekday: [{ start: '16:00', end: '21:00' }], weekend: [{ start: '10:00', end: '13:00' }, { start: '15:00', end: '19:00' }] },
        sessionLength: 40,
        breakRhythm: 'standard',
        commitments: [],
        noStudy: [{ start: '22:30', end: '07:00' }],
        quietHours: { start: '21:30', end: '07:30' },
        reminderTime: '08:00',
      },
      subjects: [
        {
          code: '9709',
          label: 'Mathematics',
          highYield: [],
          weak: [{ code: '1.7', name: 'Differentiation', source: 'weak', weight: 33 }],
          syllabus: signals.map((s) => ({ code: s.code, name: s.name, source: 'syllabus', weight: 0 })),
          hasTimedPaper: true,
          paperMinutes: 75,
          examDate: '2026-10-10',
          signals,
          selfRating: 'rusty',
          board: 'Cambridge International',
          qualification: 'A-Level',
          destinations: { lesson: ['1.7', '1.8', '1.5'], shortQuestion: ['1.7'], question: ['1.7', '1.5'] },
        },
      ],
      timeZone: 'Asia/Karachi',
      selfRatings: { '9709': 'rusty' },
    })
    console.log('roadmap-privacy: plan from buildRoadmap')
    return { ...plan, generatedAt: '2026-09-17T03:00:00Z' } as HydratedPlan
  }

  console.log('roadmap-privacy: plan from fixture (buildRoadmap not on disk)')
  const why = (explanation: string) => [{ type: 'weak_area' as const, source: 'user_performance' as const, confidence: 'medium' as const, explanation }]
  return {
    version: 3,
    examDate: '2026-10-10',
    preparedness: 'secure',
    minutesPerDay: 90,
    availability: [90, 90, 90, 90, 90, 150, 150],
    blockedDates: [],
    timeZone: 'Asia/Karachi',
    subjects: [{ code: '9709', label: 'Mathematics', examDate: '2026-10-10' }],
    totalWorkMinutes: 60,
    headline: '23 days to go.',
    generatedAt: '2026-09-17T03:00:00Z',
    mode: 'balanced',
    algorithmVersion: 3,
    revision: 1,
    days: [
      {
        day: 1,
        date: '2026-09-17',
        daysLeft: 23,
        kind: 'study',
        focus: 'Mathematics — 2 focused blocks.',
        workMinutes: 30,
        capacityMinutes: 90,
        bufferMinutes: 18,
        commitments: [],
        windows: [{ start: '16:00', end: '21:00' }],
        blocks: [
          {
            kind: 'drill',
            minutes: 10,
            subjectCode: '9709',
            subjectLabel: 'Mathematics',
            topic: { code: '1.7', name: 'Differentiation', source: 'weak', weight: 33 },
            label: 'Differentiation — quick diagnostic',
            id: '2026-09-17-9709-1.7-1',
            taskType: 'diagnostic',
            category: 'practise',
            objective: 'Answer one short Differentiation question to see where you stand.',
            why: why('Your marked work on this topic averages 33% over 1 attempt — recent practice, not yet a verdict.'),
            priority: 0.8,
            href: '/mark?practice=1&paper=9709%2F12&session=May%2FJune+2024&q=7&return=%2Fdashboard%2Fplan&task=2026-09-17-9709-1.7-1',
            resourceLabel: 'Q7 · 9709/12 May/June 2024 · short',
          },
          { kind: 'break', minutes: 5, label: '5 min off', id: '2026-09-17-x-break-1', taskType: 'break', category: 'recover', objective: '5 min off', why: [], priority: 0 },
          {
            kind: 'learn',
            minutes: 20,
            subjectCode: '9709',
            subjectLabel: 'Mathematics',
            topic: { code: '1.7', name: 'Differentiation', source: 'weak', weight: 33 },
            label: 'Differentiation — concept refresh',
            id: '2026-09-17-9709-1.7-2',
            taskType: 'concept',
            category: 'learn',
            objective: 'Re-read the full notes on Differentiation and write the chain rule from memory.',
            why: why('Listed before Integration in the syllabus, so it is worth doing first.'),
            priority: 0.8,
            provisional: true,
            href: '/courses/9709/differentiation?return=%2Fdashboard%2Fplan&task=2026-09-17-9709-1.7-2#full-notes',
            resourceLabel: 'Full notes · Differentiation',
          },
        ],
      },
    ],
  } as HydratedPlan
}

async function main() {
  const plan = normaliseRoadmap(await buildPlan())
  assert.ok(plan.days.length > 0, 'the plan has days')

  // --- every task: label, objective, explanations ---
  let tasks = 0
  for (const day of plan.days) {
    assertClean(day.focus, `day ${day.date} focus`)
    for (const t of day.blocks) {
      tasks += 1
      assertClean(t.label, `${t.id} label`)
      assertClean(t.objective, `${t.id} objective`)
      if (t.resourceLabel) assertClean(t.resourceLabel, `${t.id} resource label`)
      for (const e of t.why) {
        assertClean(e.explanation, `${t.id} why`)
        assert.ok(e.explanation.length <= EVIDENCE_EXPLANATION_MAX, `${t.id} explanation is ${e.explanation.length} chars: ${e.explanation}`)
        assert.ok(!/!/.test(e.explanation), `${t.id} explanation has no exclamation mark`)
      }
    }
  }
  assert.ok(tasks > 0, 'the plan has tasks')

  // --- every notification ---
  const kinds: RoadmapNotificationKind[] = ['block_ready', 'after_commitment', 'adjusted_after_busy_day', 'milestone_close', 'morning_checkin']
  for (const kind of kinds) {
    const { title, body } = NOTIFICATION_COPY[kind]({ minutes: 40, subject: 'Mathematics', topic: 'Differentiation', endsAt: '17:00', daysLeft: 23 })
    assertClean(title, `${kind} title`)
    assertClean(body, `${kind} body`)
  }

  // --- the email ---
  const studyDay = plan.days.find((d) => d.workMinutes > 0)!
  const email = renderPlanCheckinEmail({
    recipientName: 'Aisha',
    day: studyDay,
    line: 'Two weeks out. Trust your prep.',
    studiedLine: 'Day one. Everything starts today.',
    progress: { scheduled: 0, done: 0, behind: 0, totalWorkDays: 10, totalDone: 0 },
    unsubscribeHref: 'https://markscheme.app/email/unsubscribe?token=test',
  })
  for (const part of [email.subject, email.preheader, email.html, email.text]) assertClean(part, 'email')
  for (const word of FORBIDDEN_NUDGE_WORDS) {
    assert.ok(!email.text.toLowerCase().includes(word), `email must not say "${word}"`)
  }
  assert.ok(!email.html.includes('days done so far'), 'the tally line is gone')
  assert.ok(email.html.includes('Day one. Everything starts today.'), 'the studied line is in')
  const firstTask = studyDay.blocks.find((b) => b.href)
  if (firstTask?.id) {
    assert.ok(email.html.includes(`task=${encodeURIComponent(firstTask.id)}`) || email.html.includes(`task=${firstTask.id}`), 'task links carry the task id')
    assert.ok(email.html.includes(firstTask.objective), 'rows show the objective')
  }
  console.log('roadmap-privacy.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
