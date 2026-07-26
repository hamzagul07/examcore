import { adaptCourseHub } from './adapt-course-hub'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const lessons = [
  { slug: 'a1-1-water', title: 'Water', topicCode: 'A1.1', paper: 'P2', status: 'premium' },
  { slug: 'a1-2-nucleic', title: 'Nucleic acids', topicCode: 'A1.2', paper: 'P2', status: 'premium' },
] as unknown as CourseLessonNav[]

const none = new Set<string>()

/**
 * The board must come from the caller, not from the subject code.
 *
 * The canonical IB hub route (/ib/courses/<slug>) passes the catalog slug —
 * "biology-hl", with no `ib-` prefix — so a prefix test classified every IB
 * course as Cambridge. That is how "40 premium lessons live for Cambridge
 * biology-hl Biology" reached an indexed page: wrong board, and an internal
 * directory slug shown to the reader.
 */
const ibCanonical = adaptCourseHub('biology-hl', 'Biology', lessons, none, null, 'ib')
check('IB names the right board', ibCanonical.blurb.includes('IB Diploma'))
check('IB never says Cambridge', !/Cambridge/i.test(ibCanonical.blurb))
check('IB does not leak the slug', !ibCanonical.blurb.includes('biology-hl'))
check('IB describes criterion marking', /criterion/i.test(ibCanonical.blurb))

// The prefixed form must behave identically, since the legacy alias still uses it.
const ibPrefixed = adaptCourseHub('ib-biology-hl', 'Biology', lessons, none, null, 'ib')
check('prefixed IB matches canonical', ibPrefixed.blurb === ibCanonical.blurb)

// Prefix alone is still enough, so a caller that forgets the argument is not
// silently wrong for IB.
const ibNoArg = adaptCourseHub('ib-biology-hl', 'Biology', lessons, none, null)
check('prefix alone still detects IB', ibNoArg.blurb.includes('IB Diploma'))

// Cambridge keeps its code: "9702" is what students actually search for.
const cam = adaptCourseHub('9702', 'Physics', lessons, none, null, 'cambridge')
check('Cambridge names the right board', cam.blurb.includes('Cambridge'))
check('Cambridge keeps its subject code', cam.blurb.includes('9702'))
check('Cambridge talks about past papers', /past paper/i.test(cam.blurb))
check('Cambridge is the default', adaptCourseHub('9702', 'Physics', lessons, none, null).blurb === cam.blurb)

if (failed > 0) process.exit(1)
console.log('adapt-course-hub.test.ts: all checks passed')
