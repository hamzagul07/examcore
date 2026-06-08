import { describe, expect, it } from 'vitest'
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

describe('paper-tracks', () => {
  it('parses combined paper codes', () => {
    expect(parseLessonPaperCodes('P1/P2')).toEqual(['P1', 'P2'])
    expect(parseLessonPaperCodes('P1_P2')).toEqual(['P1', 'P2'])
  })

  it('filters 9702 P4 topics separately from P1/P2', () => {
    const lessons = [
      lesson('P1/P2', 'kinematics'),
      lesson('P4', 'gravity'),
    ]
    const tracks = getPaperTracks('9702', lessons)
    const p1 = tracks.find((t) => t.number === '1')
    const p4 = tracks.find((t) => t.number === '4')
    expect(p1?.topicCount).toBe(1)
    expect(p4?.topicCount).toBe(1)
    expect(filterLessonsByPaper(lessons, p4!)).toHaveLength(1)
  })

  it('matches P1/P2 lessons to paper 1 and paper 2 tracks', () => {
    const lessons = [lesson('P1/P2', 'units')]
    const tracks = getPaperTracks('9702', lessons)
    const p1 = tracks.find((t) => t.number === '1')
    const p2 = tracks.find((t) => t.number === '2')
    expect(lessonMatchesTrack(lessons[0], p1!)).toBe(true)
    expect(lessonMatchesTrack(lessons[0], p2!)).toBe(true)
  })
})
