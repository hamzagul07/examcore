import assert from 'node:assert/strict'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'

const labels = (d: Date) => suggestedExamDates(d).map((s) => s.label)

// Local-time constructor: the helper reads the browser's local date.
assert.deepEqual(labels(new Date(2026, 8, 16)), ['Oct/Nov 2026', 'May/June 2027'], 'mid-September: June has gone')
assert.deepEqual(labels(new Date(2026, 0, 10)), ['May/June 2026', 'Oct/Nov 2026'], 'January: both this year')
assert.deepEqual(labels(new Date(2026, 5, 1)), ['May/June 2026', 'Oct/Nov 2026'], 'early June: this session still ahead')
assert.deepEqual(labels(new Date(2026, 5, 16)), ['Oct/Nov 2026', 'May/June 2027'], 'after the June cluster date')
assert.deepEqual(labels(new Date(2026, 10, 20)), ['May/June 2027', 'Oct/Nov 2027'], 'late November: next year')
assert.deepEqual(labels(new Date(2026, 11, 31)), ['May/June 2027', 'Oct/Nov 2027'])
for (const s of suggestedExamDates(new Date(2026, 8, 16))) {
  assert.match(s.value, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(s.value > '2026-09-16', `${s.label} is in the future`)
}

console.log('exam-date.test.ts: ok')
