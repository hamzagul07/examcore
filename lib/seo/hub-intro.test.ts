import assert from 'node:assert/strict'
import { buildCourseHubIntro, buildSubjectHubIntro } from './hub-intro'
import { getMarkingSubjectPages } from './programmatic-subjects'

for (const subject of getMarkingSubjectPages()) {
  const intro = buildSubjectHubIntro(subject)
  assert.ok(intro.heading.includes(subject.code), `${subject.code} heading`)
  assert.ok(intro.paragraph.length > 80, `${subject.code} paragraph`)
}

const courseIntro = buildCourseHubIntro(
  { code: '9609', name: 'Business', level: 'A-Level' },
  120,
  45
)
assert.ok(courseIntro.heading.includes('9609'))
assert.ok(courseIntro.paragraph.includes('120'))

console.log('hub-intro.test.ts: ok')
