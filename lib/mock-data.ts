/**
 * Demo / mock data used when a Wave 1 user has no real attempts yet.
 *
 * Goal: show what the dashboard WILL look like once they've marked a few
 * questions, without lying about their actual data. The Progress page wraps
 * these in a "Preview mode" banner so the empty-data experience reads as
 * intentional rather than broken.
 *
 * Mock attempts span a few weeks, hit a variety of syllabus topics, and
 * include realistic time-per-mark values so the speed-vs-accuracy scatter renders sensibly.
 */

import type { AttemptLite } from './mastery'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString()
}

export const MOCK_ATTEMPTS: AttemptLite[] = [
  {
    id: 'mock-1',
    marks_earned: 5,
    total_marks: 6,
    syllabus_tags: ['1.6'],
    created_at: daysAgo(1),
    time_spent_seconds: 95,
    question_text: 'Find the term independent of x in (1-4x)^6 (1 + 1/x)^4',
    source_type: 'past_paper',
  },
  {
    id: 'mock-2',
    marks_earned: 4,
    total_marks: 7,
    syllabus_tags: ['1.7'],
    created_at: daysAgo(2),
    time_spent_seconds: 130,
    question_text: 'Differentiate y = (3x^2 + 1)/(x - 2)',
    source_type: 'past_paper',
  },
  {
    id: 'mock-3',
    marks_earned: 6,
    total_marks: 8,
    syllabus_tags: ['1.8'],
    created_at: daysAgo(4),
    time_spent_seconds: 145,
    question_text: 'Find the area between y = x^2 and y = 4',
    source_type: 'past_paper',
  },
  {
    id: 'mock-4',
    marks_earned: 2,
    total_marks: 5,
    syllabus_tags: ['5.5'],
    created_at: daysAgo(5),
    time_spent_seconds: 110,
    question_text: 'P(X > 12) where X ~ N(10, 4)',
    source_type: 'past_paper',
  },
  {
    id: 'mock-5',
    marks_earned: 3,
    total_marks: 4,
    syllabus_tags: ['1.5'],
    created_at: daysAgo(7),
    time_spent_seconds: 80,
    question_text: 'Solve 2 sin(x) cos(x) = sin(x) for 0 <= x <= 2π',
    source_type: 'past_paper',
  },
  {
    id: 'mock-6',
    marks_earned: 5,
    total_marks: 5,
    syllabus_tags: ['1.1'],
    created_at: daysAgo(10),
    time_spent_seconds: 70,
    question_text: 'Find the discriminant of 2x^2 - 3x + k = 0',
    source_type: 'past_paper',
  },
  {
    id: 'mock-7',
    marks_earned: 1,
    total_marks: 6,
    syllabus_tags: ['3.7'],
    created_at: daysAgo(14),
    time_spent_seconds: 175,
    question_text: 'Find the angle between vectors a and b',
    source_type: 'past_paper',
  },
]

/**
 * Sample line references for the Examiner's Ink overlay. The bbox values are
 * the canonical ones from the spec, but tweaked slightly so the overlay
 * positions look plausible against a generic notebook-style demo image.
 */
export const MOCK_LINE_REFERENCES: LineReference[] = [
  {
    mark_id: 'B1',
    earned: true,
    margin_note: null,
    error_classification: 'no_error',
    bbox: { top: 22, left: 6, width: 55, height: 5 },
    snippet: '(1-4x)^6 expansion',
  },
  {
    mark_id: 'M1',
    earned: true,
    margin_note: null,
    error_classification: 'no_error',
    bbox: { top: 38, left: 6, width: 48, height: 5 },
    snippet: '240 = 12 × 80a²',
  },
  {
    mark_id: 'A1',
    earned: false,
    margin_note: 'Sign error - check the working',
    error_classification: 'algebraic_sign',
    bbox: { top: 56, left: 6, width: 30, height: 5 },
    snippet: 'a = -0.5',
  },
  {
    mark_id: 'A1',
    earned: false,
    margin_note: 'Final answer not given',
    error_classification: 'incomplete',
    bbox: { top: 72, left: 6, width: 25, height: 5 },
    snippet: 'final answer',
  },
]

export const PREVIEW_BANNER_COPY = {
  title: 'Preview mode',
  body: 'This is how your dashboard will look once you\u2019ve marked a few questions. The numbers below are sample data — mark your first answer to see your own.',
  ctaText: 'Mark your first answer',
  ctaHref: '/mark',
}
