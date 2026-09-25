import assert from 'node:assert/strict'
import { escapeText, renderPlanIcs } from '@/lib/plan/ics'
import { workBlocks, type HydratedPlan } from '@/lib/plan/plan-view'

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
    {
      day: 4,
      date: '2026-09-18',
      daysLeft: 17,
      kind: 'study',
      focus: 'A roadmap day.',
      workMinutes: 30,
      blocks: [
        { kind: 'learn', minutes: 20, label: 'Read the Series lesson', href: '/courses/9709/series#worked', taskType: 'concept' },
        { kind: 'break', minutes: 5, label: '5 min off', taskType: 'break' },
        { kind: 'drill', minutes: 10, label: 'Quick check on Series', href: '/mark?subject=9709', taskType: 'diagnostic' },
        { kind: 'buffer', minutes: 25, label: 'In hand — use it if you need it, or stop early.', taskType: 'buffer' },
      ],
    },
  ],
}

const ics = renderPlanIcs(plan, { siteUrl: 'https://markscheme.app', planUrl: 'https://markscheme.app/dashboard/plan' })
const lines = ics.split('\r\n')

assert.equal(lines[0], 'BEGIN:VCALENDAR')
assert.equal(lines[lines.length - 2], 'END:VCALENDAR', 'ends with END:VCALENDAR + CRLF')
assert.equal(lines[lines.length - 1], '')
assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 5, 'four days + the exam')

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

// A roadmap day: learn rows render like drills, buffers and breaks are not listed, and the summary counts work only.
{
  assert.ok(unfolded.includes('• 20 min — Read the Series lesson https://markscheme.app/courses/9709/series#worked'), 'a learn block is a row with its link')
  assert.ok(unfolded.includes('• 10 min — Quick check on Series'), 'the drill follows')
  assert.ok(!unfolded.includes('In hand'), 'time in hand is not an event row')
  assert.ok(!unfolded.includes('5 min off'), 'breaks are not rows')
  assert.ok(ics.includes('SUMMARY:Day 4 · 30 min · 17 days to go'), 'the buffer is not counted as work')
  const roadmapDay = plan.days[3]!
  assert.deepEqual(workBlocks(roadmapDay).map((b) => b.kind), ['learn', 'drill'], 'workBlocks excludes the buffer and the break')
}


// --- escapeText: every kind of line break becomes the literal \n --------------------
{
  assert.equal(escapeText('a\nb'), 'a\\nb', 'LF')
  assert.equal(escapeText('a\r\nb'), 'a\\nb', 'CRLF is one break, not two')
  assert.equal(escapeText('a\rb'), 'a\\nb', 'a lone CR is a line break too')
  assert.equal(escapeText('a\r\r\nb\r'), 'a\\n\\nb\\n', 'mixed and trailing breaks')
  assert.equal(escapeText('x\\y;z,w'), 'x\\\\y\\;z\\,w', 'RFC 5545 specials')
  assert.equal(escapeText('\\n'), '\\\\n', 'a literal backslash-n is escaped, not mistaken for a break')
  assert.ok(!/[\r\n]/.test(escapeText('one\rtwo\nthree\r\nfour')), 'no raw line terminator survives')
}

// A lone CR inside plan text (pasted from a Windows editor, or left behind by a
// form control) used to pass through raw and terminate the DESCRIPTION line
// early, so the rest of it parsed as a property of its own.
{
  const withCr: HydratedPlan = {
    ...plan,
    days: [
      {
        ...plan.days[0]!,
        focus: 'Line one\rline two',
        blocks: [{ kind: 'drill', minutes: 25, label: 'Label with\rcarriage return', href: '/mark' }],
      },
    ],
  }
  const out = renderPlanIcs(withCr, { siteUrl: 'https://markscheme.app', planUrl: 'https://markscheme.app/dashboard/plan' })
  for (const l of out.split('\r\n')) {
    assert.ok(!l.includes('\r'), `a raw CR reached the output: ${JSON.stringify(l.slice(0, 60))}`)
  }
  const flat = out.replace(/\r\n /g, '')
  assert.ok(flat.includes('Line one\\nline two'), 'the CR in the focus is an escaped break')
  assert.ok(flat.includes('Label with\\ncarriage return'), 'the CR in a block label is an escaped break')
  assert.ok(flat.split('\r\n').every((l) => /^[A-Z-]+[;:]|^(BEGIN|END):|^$/.test(l)), 'every line is still a property')
}

console.log('ics.test.ts: ok')
