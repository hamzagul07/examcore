import assert from 'node:assert/strict'
import { assertAllMarkingSubjectsHaveSeo } from './subject-seo-assert'
import {
  buildSubjectCourseSeo,
  buildSubjectMarkingSeo,
  getAllSubjectSeoProfiles,
  keywordsForSubjectPath,
} from './subject-seo'
import { getMarkingSubjectPages } from './programmatic-subjects'

const missing = assertAllMarkingSubjectsHaveSeo()
assert.equal(missing.length, 0, `missing SEO profiles: ${missing.join(', ')}`)

assert.equal(getAllSubjectSeoProfiles().length, 24, '24 subject SEO profiles')

for (const subject of getMarkingSubjectPages()) {
  const marking = buildSubjectMarkingSeo(subject)
  assert.ok(marking.title.length > 10, `${subject.code} marking title`)
  assert.ok(marking.description.length >= 80, `${subject.code} marking description`)
  assert.ok(marking.keywords.length >= 3, `${subject.code} keywords`)
  assert.ok(!marking.description.includes('Definition coming soon'), `${subject.code} clean desc`)

  const course = buildSubjectCourseSeo(
    { code: subject.code, name: subject.label, level: 'A-Level' },
    42
  )
  assert.ok(course.description.includes('42'), `${subject.code} course count`)
  assert.ok(course.ogImagePath.includes(subject.code), `${subject.code} og path`)
}

assert.deepEqual(
  keywordsForSubjectPath('/subjects/9709')?.slice(0, 1),
  ['9709 past papers']
)

console.log('subject-seo.test.ts: ok')
