import { filterLessonsByPaper, getPaperTracks, type PaperTrackWithStats } from '@/lib/courses/paper-tracks'
import { getSyllabusTree } from '@/lib/syllabi'
import type { CourseLesson } from '@/lib/courses/types'
import type { MarginNotesCourse, MarginNotesPaper, MarginNotesUnit } from '@/lib/courses/margin-notes/types'
import { lessonToTopic } from '@/lib/courses/margin-notes/adapt-spine'

function paperTabId(track: PaperTrackWithStats): number {
  const n = parseInt(track.number, 10)
  return Number.isFinite(n) ? n : track.number.charCodeAt(0)
}

function buildSpineForTrack(
  subjectCode: string,
  lessons: CourseLesson[],
  track: PaperTrackWithStats,
  completedSlugs: Set<string>,
  activeSlug: string | null
): MarginNotesUnit[] {
  const filtered = filterLessonsByPaper(lessons, track)
  const tree = getSyllabusTree(subjectCode)
  if (!tree?.length) {
    return [
      {
        unit: 'Topics',
        items: filtered.map((l) =>
          lessonToTopic(l, {
            done: completedSlugs.has(l.slug),
            active: l.slug === activeSlug,
          })
        ),
      },
    ]
  }

  const slugByCode = new Map(filtered.map((l) => [l.topicCode, l]))
  const units: MarginNotesUnit[] = []

  for (const group of tree) {
    const items = group.leaves
      .filter((leaf) => slugByCode.has(leaf.code))
      .map((leaf) => {
        const lesson = slugByCode.get(leaf.code)!
        return lessonToTopic(lesson, {
          done: completedSlugs.has(lesson.slug),
          active: lesson.slug === activeSlug,
        })
      })
    if (!items.length) continue
    const parentName = group.parent.name !== group.parent.code ? group.parent.name : ''
    units.push({
      unit: parentName ? `${group.parent.code} · ${parentName}` : group.parent.code,
      items,
    })
  }

  const inSpine = new Set(units.flatMap((u) => u.items.map((i) => i.n)))
  const orphans = filtered.filter((l) => !inSpine.has(l.topicCode))
  if (orphans.length) {
    units.push({
      unit: 'Other topics',
      items: orphans.map((l) =>
        lessonToTopic(l, {
          done: completedSlugs.has(l.slug),
          active: l.slug === activeSlug,
        })
      ),
    })
  }

  return units
}

export function adaptCourseHub(
  subjectCode: string,
  subjectName: string,
  lessons: CourseLesson[],
  completedSlugs: Set<string>,
  activeSlug: string | null
): MarginNotesCourse {
  const tracks = getPaperTracks(subjectCode, lessons)
  const published = lessons.filter((l) => l.status === 'published' || l.status === 'premium').length

  const blurb =
    published > 0
      ? `${published} premium lessons live for Cambridge ${subjectCode} ${subjectName}. Learn visually, read concise notes, then mark real past papers on every topic.`
      : `${lessons.length} official syllabus topics for Cambridge ${subjectCode} ${subjectName}. Learn visually, then mark real past papers on every topic.`

  const papers: MarginNotesPaper[] = tracks.map((track) => ({
    id: paperTabId(track),
    number: track.number,
    name: `${track.shortName} — ${track.subtitle}`,
    topics: track.topicCount,
  }))

  const spines: Record<number, MarginNotesUnit[]> = {}
  for (const track of tracks) {
    spines[paperTabId(track)] = buildSpineForTrack(
      subjectCode,
      lessons,
      track,
      completedSlugs,
      activeSlug
    )
  }

  const firstTrack = tracks[0]
  const units = firstTrack
    ? buildSpineForTrack(subjectCode, lessons, firstTrack, completedSlugs, activeSlug)
    : []

  return { blurb, papers, spines, units }
}

export function hubPaperProgress(
  spine: MarginNotesUnit[] | null | undefined
): { done: number; total: number; pct: number } {
  const items = (spine ?? []).flatMap((g) => g.items)
  const total = items.length
  const done = items.filter((i) => i.done).length
  const pct = total ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}
