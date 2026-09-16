import assert from 'node:assert/strict'
import { renderPlanIcs } from '@/lib/plan/ics'
import type { HydratedPlan } from '@/lib/plan/plan-view'

const plan: HydratedPlan = {
  version: 2,
  examDate: '2026-10-05',
  preparedness: 'pass',
  minutesPerDay: 90,
  availability: [90, 90, 90, 90, 90, 90, 90],
  blockedDates: [],
  timeZone: 'Asia/Karachi',
  subjects: [
    { code: '9709', label: 'Mathematics', examDate: '2026-10-05' },
    { code: '9702', label: 'Physics', examDate: '2026-09-17' },
  ],
  totalWorkMinutes: 75,
  headline: 'h',
  generatedAt: '2026-09-16T07:30:00.000Z',
  days: [
    {
      day: 1,
      date: '2026-09-16',
      daysLeft: 19,
      kind: 'study',
      focus: 'Mathematics — 3 focused blocks; semicolons, commas, and a\nnewline.',
      workMinutes: 75,
      blocks: [
        { kind: 'drill', minutes: 25, label: 'Series — in 15 recent papers; one question, then mark it', href: '/mark?practice=1&paper=9709%2F12&q=2(b)' },
        { kind: 'break', minutes: 5, label: '5 min off' },
        { kind: 'drill', minutes: 25, label: 'A very long label that will certainly need folding because iCalendar lines are limited to seventy-five octets and this one is longer than that by some margin', href: '/mark' },
      ],
    },
    { day: 2, date: '2026-09-17', daysLeft: 18, kind: 'exam', focus: 'Physics exam today.', workMinutes: 0, blocks: [{ kind: 'rest', minutes: 0, label: 'Rest' }] },
    { day: 3, date: '2026-10-04', daysLeft: 1, kind: 'review', focus: 'Light review, then stop.', workMinutes: 25, blocks: [{ kind: 'review', minutes: 25, label: 'Re-read', href: '/dashboard/review' }] },
  ],
}

const ics = renderPlanIcs(plan, { siteUrl: 'https://markscheme.app', planUrl: 'https://markscheme.app/dashboard/plan' })
const lines = ics.split('\r\n')

assert.equal(lines[0], 'BEGIN:VCALENDAR')
assert.equal(lines[lines.length - 2], 'END:VCALENDAR', 'ends with END:VCALENDAR + CRLF')
assert.equal(lines[lines.length - 1], '')
assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 4, 'three days + the exam')

// All-day events with an exclusive end.
assert.ok(ics.includes('DTSTART;VALUE=DATE:20260916\r\nDTEND;VALUE=DATE:20260917'))
assert.ok(ics.includes('DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261006'), 'exam day')
assert.ok(ics.includes('SUMMARY:Day 1 · 1 h 15 min · 19 days to go'))
assert.ok(ics.includes('SUMMARY:Exam day — Physics'), "a subject's own exam day inside the plan")
assert.ok(ics.includes('SUMMARY:Day 3 · Review · 1 day to go'))
assert.ok(ics.includes('SUMMARY:Exam day — Mathematics'), 'the last exam names only the subjects sitting it')

// Folding: no line over 75 octets, continuation lines start with a space.
for (const l of lines) assert.ok(Buffer.byteLength(l, 'utf8') <= 75, `line too long (${Buffer.byteLength(l)}): ${l.slice(0, 40)}`)
const unfolded = ics.replace(/\r\n /g, '')
assert.ok(unfolded.includes('A very long label that will certainly need folding'), 'unfolding restores the text')

// Text escaping (checked on the unfolded text — the folded line is cut mid-way).
assert.ok(unfolded.includes('semicolons\\, commas\\, and a\\nnewline.'), 'commas and newlines escaped')
assert.ok(unfolded.includes('3 focused blocks\\;'), 'semicolons escaped')

// Stable UIDs per generation.
assert.ok(ics.includes('UID:plan-20260916073000000-day-1@markscheme.app'))
assert.ok(ics.includes('UID:plan-20260916073000000-exam@markscheme.app'))
assert.ok(ics.includes('DTSTAMP:20260916T073000Z'))

// Links in the description are absolute.
assert.ok(unfolded.includes('https://markscheme.app/mark?practice=1&paper=9709%2F12&q=2(b)'))
assert.ok(unfolded.includes('Open the plan: https://markscheme.app/dashboard/plan'))

console.log('ics.test.ts: ok')
