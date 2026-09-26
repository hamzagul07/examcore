import assert from 'node:assert/strict'
import { DEFAULT_READING_PREFS, isDefaultReading, parseReadingPrefs } from '@/lib/courses/reading-prefs'

assert.deepEqual(parseReadingPrefs(null), DEFAULT_READING_PREFS)
assert.deepEqual(parseReadingPrefs(''), DEFAULT_READING_PREFS)
assert.deepEqual(parseReadingPrefs('not json'), DEFAULT_READING_PREFS, 'corrupt storage never throws')
assert.deepEqual(parseReadingPrefs('[]'), DEFAULT_READING_PREFS)
assert.deepEqual(parseReadingPrefs('{"font":"book","size":"xl","air":true}'), { font: 'book', size: 'xl', air: true })
assert.deepEqual(
  parseReadingPrefs('{"font":"comic","size":"huge","air":"yes"}'),
  DEFAULT_READING_PREFS,
  'unknown values fall back field by field'
)
assert.deepEqual(parseReadingPrefs('{"font":"clear"}'), { font: 'clear', size: 'm', air: false })
assert.equal(DEFAULT_READING_PREFS.font, 'book', 'lessons open in the book face')
assert.deepEqual(parseReadingPrefs('{"size":"l"}'), { font: 'book', size: 'l', air: false }, 'a missing font falls back to Book')
assert.ok(isDefaultReading(DEFAULT_READING_PREFS))
assert.ok(!isDefaultReading({ font: 'default', size: 'm', air: false }), 'Sans is a choice, not the default')
assert.ok(!isDefaultReading({ font: 'book', size: 'l', air: false }))
assert.ok(!isDefaultReading({ font: 'book', size: 'm', air: true }))
assert.notEqual(parseReadingPrefs(null), DEFAULT_READING_PREFS, 'a fresh object, never the shared default')

console.log('reading-prefs.test.ts: ok')
