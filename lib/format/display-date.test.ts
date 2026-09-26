import assert from 'node:assert/strict'
import { formatDisplayDate, formatDisplayNumber } from '@/lib/format/display-date'

/**
 * These strings are rendered on the server and again during hydration, so they
 * must depend only on the arguments — never on the runtime's locale, zone or
 * ICU version.
 */
function main() {
  // 21:30 UTC on 4 Sep is already 5 Sep in Karachi (UTC+5).
  const lateEvening = '2026-09-04T21:30:00Z'
  assert.equal(formatDisplayDate(lateEvening), '4 Sep 2026', 'UTC and short month with year by default')
  assert.equal(formatDisplayDate(lateEvening, {}, 'Asia/Karachi'), '5 Sep 2026', "the reader's own day")
  assert.equal(formatDisplayDate(lateEvening, { year: false }), '4 Sep')
  assert.equal(formatDisplayDate(lateEvening, { month: 'long' }), '4 September 2026')
  assert.equal(formatDisplayDate(lateEvening, { month: 'long', year: false }), '4 September')
  assert.equal(formatDisplayDate('2026-12-31T23:30:00Z', {}, 'Asia/Karachi'), '1 Jan 2027', 'year rolls with the zone')
  assert.equal(formatDisplayDate(new Date(lateEvening)), '4 Sep 2026', 'accepts a Date')
  assert.equal(formatDisplayDate(Date.parse(lateEvening)), '4 Sep 2026', 'accepts epoch ms')

  // Missing or bad input never throws.
  assert.equal(formatDisplayDate(null), '')
  assert.equal(formatDisplayDate(undefined), '')
  assert.equal(formatDisplayDate(''), '')
  assert.equal(formatDisplayDate('not a date'), '')
  assert.equal(formatDisplayDate(Number.NaN), '')
  assert.equal(formatDisplayDate(lateEvening, {}, 'Not/AZone'), '4 Sep 2026', 'an unknown zone falls back to UTC')

  assert.equal(formatDisplayNumber(0), '0')
  assert.equal(formatDisplayNumber(999), '999')
  assert.equal(formatDisplayNumber(1669), '1,669')
  assert.equal(formatDisplayNumber(1234567), '1,234,567')
  assert.equal(formatDisplayNumber(-4369), '-4,369')

  console.log('display-date: ok')
}

main()
