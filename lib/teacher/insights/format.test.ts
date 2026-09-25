import assert from 'node:assert/strict'
import { dueAgeLabel, firstNameOf, formatMark, relativeDay, shortDate } from '@/lib/teacher/insights/format'

const NOW = Date.parse('2026-09-25T12:00:00Z')

// --- due age ---------------------------------------------------------------------------------

assert.equal(dueAgeLabel('2026-09-25T08:00:00Z', NOW), 'due today')
assert.equal(dueAgeLabel('2026-09-26T08:00:00Z', NOW), 'due today', 'not yet due reads as due')
assert.equal(dueAgeLabel('2026-09-24T08:00:00Z', NOW), '1 day overdue')
assert.equal(dueAgeLabel('2026-09-13T08:00:00Z', NOW), '12 days overdue')
assert.equal(dueAgeLabel('garbage', NOW), 'due')
assert.equal(dueAgeLabel('2026-09-13T08:00:00Z', Number.NaN), 'due')

// --- relative days ---------------------------------------------------------------------------

assert.equal(relativeDay('2026-09-25T00:30:00Z', NOW), 'today')
assert.equal(relativeDay('2026-09-24T23:30:00Z', NOW), 'yesterday', 'UTC day boundaries, not 24h')
assert.equal(relativeDay('2026-09-20T12:00:00Z', NOW), '5 days ago')
assert.equal(relativeDay('2026-09-12T12:00:00Z', NOW), '13 days ago')
assert.equal(relativeDay('2026-09-11T12:00:00Z', NOW), '11 Sep')
assert.equal(relativeDay('2025-12-03T12:00:00Z', NOW), '3 Dec 2025', 'another year is named')
assert.equal(relativeDay('2026-09-26T12:00:00Z', NOW), 'today', 'a future stamp (skew) is today')
assert.equal(relativeDay(null, NOW), null)
assert.equal(relativeDay('not a date', NOW), null)
assert.equal(shortDate('2026-01-05T00:00:00Z', NOW), '5 Jan')
assert.equal(shortDate('2027-01-05T00:00:00Z', NOW), '5 Jan 2027')
assert.equal(shortDate(null, NOW), null)

// --- names and marks -------------------------------------------------------------------------

assert.equal(firstNameOf('Amira K.'), 'Amira')
assert.equal(firstNameOf('Student'), 'Student')
assert.equal(formatMark(7), '7')
assert.equal(formatMark(7.5), '7.5')
assert.equal(formatMark(7.4999), '7.5')
assert.equal(formatMark(0.04), '0')

console.log('lib/teacher/insights/format.test.ts — all assertions passed')
