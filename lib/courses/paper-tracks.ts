import type { CourseLesson } from '@/lib/courses/types'

export type PaperTrack = {
  id: string
  /** URL / query value, e.g. "1" for Paper 1 */
  number: string
  shortName: string
  subtitle: string
  /** Syllabus paper codes this track includes, e.g. P1, P2, P4 */
  matchCodes: string[]
  /** Show even when topicCount is 0 (practical / planning papers) */
  alwaysShow?: boolean
}

const SCIENCE_TRACKS: PaperTrack[] = [
  {
    id: 'p1',
    number: '1',
    shortName: 'Paper 1',
    subtitle: 'Multiple choice',
    matchCodes: ['P1'],
  },
  {
    id: 'p2',
    number: '2',
    shortName: 'Paper 2',
    subtitle: 'AS structured questions',
    matchCodes: ['P2'],
  },
  {
    id: 'p3',
    number: '3',
    shortName: 'Paper 3',
    subtitle: 'Advanced practical skills',
    matchCodes: ['P1', 'P2', 'P3'],
    alwaysShow: true,
  },
  {
    id: 'p4',
    number: '4',
    shortName: 'Paper 4',
    subtitle: 'A Level structured questions',
    matchCodes: ['P4'],
  },
  {
    id: 'p5',
    number: '5',
    shortName: 'Paper 5',
    subtitle: 'Planning, analysis & evaluation',
    matchCodes: ['P1', 'P2', 'P5'],
    alwaysShow: true,
  },
]

const BIOLOGY_CHEMISTRY_TRACKS: PaperTrack[] = [
  {
    id: 'p12',
    number: '1-2',
    shortName: 'Papers 1 & 2',
    subtitle: 'AS Level',
    matchCodes: ['P1', 'P2'],
  },
  {
    id: 'p4',
    number: '4',
    shortName: 'Paper 4',
    subtitle: 'A Level structured questions',
    matchCodes: ['P4'],
  },
]

const BIOLOGY_TRACKS: PaperTrack[] = [
  ...BIOLOGY_CHEMISTRY_TRACKS,
  {
    id: 'p3',
    number: '3',
    shortName: 'Paper 3',
    subtitle: 'Advanced practical skills',
    matchCodes: ['P1', 'P2', 'P3'],
    alwaysShow: true,
  },
  {
    id: 'p5',
    number: '5',
    shortName: 'Paper 5',
    subtitle: 'Planning, analysis & evaluation',
    matchCodes: ['P1', 'P2', 'P5'],
    alwaysShow: true,
  },
]

/** Parse syllabus paper field into comparable codes (P1, P2, P4, AS, AL, …). */
export function parseLessonPaperCodes(paper: string): string[] {
  return paper
    .split(/[/_,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function lessonMatchesTrack(lesson: CourseLesson, track: PaperTrack): boolean {
  const codes = parseLessonPaperCodes(lesson.paper)
  return track.matchCodes.some((mc) => codes.includes(mc))
}

function tracksForSubject(subjectCode: string): PaperTrack[] | null {
  if (subjectCode === '9702') return SCIENCE_TRACKS
  if (subjectCode === '9700') return BIOLOGY_TRACKS
  if (subjectCode === '9701') {
    return [
      {
        id: 'as',
        number: 'as',
        shortName: 'AS Level',
        subtitle: 'Papers 1–3',
        matchCodes: ['AS'],
      },
      {
        id: 'al',
        number: 'al',
        shortName: 'A Level',
        subtitle: 'Papers 4–5',
        matchCodes: ['AL'],
      },
    ]
  }
  return null
}

/** Derive paper tracks from lesson metadata when no subject preset exists (e.g. 9709). */
function deriveTracksFromLessons(lessons: CourseLesson[]): PaperTrack[] {
  const byPaper = new Map<string, { paperName: string; count: number }>()
  for (const lesson of lessons) {
    const key = lesson.paper
    const prev = byPaper.get(key)
    byPaper.set(key, {
      paperName: lesson.paperName,
      count: (prev?.count ?? 0) + 1,
    })
  }

  return [...byPaper.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([paper, meta]) => ({
      id: paper.toLowerCase(),
      number: paper.replace(/^P/i, '').toLowerCase() || paper.toLowerCase(),
      shortName: meta.paperName,
      subtitle: `${meta.count} topics`,
      matchCodes: parseLessonPaperCodes(paper),
    }))
}

export type PaperTrackWithStats = PaperTrack & {
  topicCount: number
  premiumCount: number
}

export function getPaperTracks(
  subjectCode: string,
  lessons: CourseLesson[]
): PaperTrackWithStats[] {
  const base = tracksForSubject(subjectCode) ?? deriveTracksFromLessons(lessons)
  const withStats = base.map((track) => {
    const matched = lessons.filter((l) => lessonMatchesTrack(l, track))
    const premiumCount = matched.filter(
      (l) => l.status === 'published' || l.status === 'premium'
    ).length
    return {
      ...track,
      topicCount: matched.length,
      premiumCount,
    }
  })

  return withStats.filter((t) => t.topicCount > 0 || t.alwaysShow)
}

export function subjectHasPaperChoice(subjectCode: string, lessons: CourseLesson[]): boolean {
  return getPaperTracks(subjectCode, lessons).length > 1
}

export function findPaperTrack(
  subjectCode: string,
  lessons: CourseLesson[],
  paperNumber: string | null | undefined
): PaperTrackWithStats | null {
  if (!paperNumber) return null
  const tracks = getPaperTracks(subjectCode, lessons)
  return (
    tracks.find(
      (t) => t.number === paperNumber || t.id === paperNumber.toLowerCase()
    ) ?? null
  )
}

export function filterLessonsByPaper(
  lessons: CourseLesson[],
  track: PaperTrack | null
): CourseLesson[] {
  if (!track) return lessons
  return lessons.filter((l) => lessonMatchesTrack(l, track))
}

export function defaultPaperTrack(
  subjectCode: string,
  lessons: CourseLesson[]
): PaperTrackWithStats | null {
  const tracks = getPaperTracks(subjectCode, lessons)
  return tracks[0] ?? null
}
