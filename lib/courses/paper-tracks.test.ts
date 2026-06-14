import assert from 'node:assert/strict'
import {
  filterLessonsByPaper,
  getPaperTracks,
  lessonMatchesTrack,
  parseLessonPaperCodes,
} from './paper-tracks'
import type { CourseLesson } from './types'

function lesson(paper: string, slug: string): CourseLesson {
  return {
    slug,
    topicCode: slug,
    title: slug,
    paper,
    paperName: paper,
    status: 'published',
    summary: 'test',
    durationMin: 10,
    sections: [{ type: 'intro', content: 'x' }],
  }
}

assert.deepEqual(parseLessonPaperCodes('P1/P2'), ['P1', 'P2'])
assert.deepEqual(parseLessonPaperCodes('P1_P2'), ['P1', 'P2'])

const lessons = [lesson('P1/P2', 'kinematics'), lesson('P4', 'gravity')]
const tracks = getPaperTracks('9702', lessons)
const p1 = tracks.find((t) => t.number === '1')
const p4 = tracks.find((t) => t.number === '4')
assert.equal(p1?.topicCount, 1)
assert.equal(p4?.topicCount, 1)
assert.equal(filterLessonsByPaper(lessons, p4!).length, 1)

const sharedLessons = [lesson('P1/P2', 'units')]
const sharedTracks = getPaperTracks('9702', sharedLessons)
const sharedP1 = sharedTracks.find((t) => t.number === '1')
const sharedP2 = sharedTracks.find((t) => t.number === '2')
assert.equal(lessonMatchesTrack(sharedLessons[0], sharedP1!), true)
assert.equal(lessonMatchesTrack(sharedLessons[0], sharedP2!), true)

console.log('paper-tracks.test.ts: ok')
