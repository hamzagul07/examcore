import { getApMarkableContentCodes } from '@/lib/ap/marking'
import {
  apStudyLabel,
  apStudyLessonHref,
  apStudyMarkHref,
  apStudySubjectHubHref,
} from '@/lib/ap/study-path'
import { getAqaMarkableContentCodes } from '@/lib/aqa/marking'
import {
  aqaStudyLabel,
  aqaStudyLessonHref,
  aqaStudyMarkHref,
  aqaStudySubjectHubHref,
} from '@/lib/aqa/study-path'
import { getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import {
  edexcelStudyLessonHref,
  edexcelStudyMarkHref,
  edexcelStudyUnitHubHref,
} from '@/lib/edexcel/study-path'
import { getOxfordaqaMarkableContentCodes } from '@/lib/oxfordaqa/marking'
import {
  oxfordaqaStudyLabel,
  oxfordaqaStudyLessonHref,
  oxfordaqaStudyMarkHref,
  oxfordaqaStudySubjectHubHref,
} from '@/lib/oxfordaqa/study-path'
import {
  verifiedCourseLessonsForApSubject,
  verifiedCourseLessonsForAqaSubject,
  verifiedCourseLessonsForEdexcelUnit,
  verifiedCourseLessonsForOxfordaqaSubject,
} from '@/lib/curriculum-graph/verified-course-links'

export type StudyBridgeBoard = 'edexcel' | 'oxfordaqa' | 'aqa' | 'ap'

/**
 * Everything a lesson needs to keep a board study path alive, precomputed.
 *
 * A CAIE lesson opened from an Edexcel/OxfordAQA/AQA/AP study path carries
 * `?board=…&unit=…` (or `&subject=…`) and shows a bridge strip + board-flavored
 * mark CTA. The lesson page used to derive all of this from `searchParams` on
 * the server — which made every lesson render dynamic. The set of study
 * contexts a lesson can belong to is fixed at build time, so it is inverted
 * here once and embedded in the static page; a client component picks the
 * active bridge (if any) from `location.search` after mount.
 */
export type LessonStudyBridge = {
  board: StudyBridgeBoard
  /** Matches the query value: unit code (edexcel, uppercase) or content code (lowercase). */
  key: string
  /** CTA text: 'WMA11', 'Physics', … — the bridge strips add their own framing. */
  label: string
  markHref: string
  hubHref: string
  nextLesson: { href: string; title: string; topicCode: string } | null
}

let cache: Map<string, LessonStudyBridge[]> | null = null

function addBridge(map: Map<string, LessonStudyBridge[]>, href: string, bridge: LessonStudyBridge) {
  const list = map.get(href)
  if (list) list.push(bridge)
  else map.set(href, [bridge])
}

function buildMap(): Map<string, LessonStudyBridge[]> {
  const map = new Map<string, LessonStudyBridge[]>()

  for (const unit of getEdexcelMarkableUnitCodes()) {
    const hubHref = edexcelStudyUnitHubHref(unit)
    if (!hubHref) continue
    const lessons = verifiedCourseLessonsForEdexcelUnit(unit)
    lessons.forEach((lesson, i) => {
      const next = lessons[i + 1]
      addBridge(map, lesson.href, {
        board: 'edexcel',
        key: unit,
        label: unit,
        markHref: edexcelStudyMarkHref(unit, lesson.href, lesson.topicCode),
        hubHref,
        nextLesson: next
          ? { href: edexcelStudyLessonHref(next.href, unit), title: next.title, topicCode: next.topicCode }
          : null,
      })
    })
  }

  for (const code of getOxfordaqaMarkableContentCodes()) {
    const hubHref = oxfordaqaStudySubjectHubHref(code)
    if (!hubHref) continue
    const lessons = verifiedCourseLessonsForOxfordaqaSubject(code)
    lessons.forEach((lesson, i) => {
      const next = lessons[i + 1]
      addBridge(map, lesson.href, {
        board: 'oxfordaqa',
        key: code,
        label: oxfordaqaStudyLabel(code),
        markHref: oxfordaqaStudyMarkHref(code, lesson.href, lesson.topicCode),
        hubHref,
        nextLesson: next
          ? { href: oxfordaqaStudyLessonHref(next.href, code), title: next.title, topicCode: next.topicCode }
          : null,
      })
    })
  }

  for (const code of getAqaMarkableContentCodes()) {
    const hubHref = aqaStudySubjectHubHref(code)
    if (!hubHref) continue
    const lessons = verifiedCourseLessonsForAqaSubject(code)
    lessons.forEach((lesson, i) => {
      const next = lessons[i + 1]
      addBridge(map, lesson.href, {
        board: 'aqa',
        key: code,
        label: aqaStudyLabel(code),
        markHref: aqaStudyMarkHref(code, lesson.href, lesson.topicCode),
        hubHref,
        nextLesson: next
          ? { href: aqaStudyLessonHref(next.href, code), title: next.title, topicCode: next.topicCode }
          : null,
      })
    })
  }

  for (const code of getApMarkableContentCodes()) {
    const hubHref = apStudySubjectHubHref(code)
    if (!hubHref) continue
    const lessons = verifiedCourseLessonsForApSubject(code)
    lessons.forEach((lesson, i) => {
      const next = lessons[i + 1]
      addBridge(map, lesson.href, {
        board: 'ap',
        key: code,
        label: apStudyLabel(code),
        markHref: apStudyMarkHref(code, lesson.href, lesson.topicCode),
        hubHref,
        nextLesson: next
          ? { href: apStudyLessonHref(next.href, code), title: next.title, topicCode: next.topicCode }
          : null,
      })
    })
  }

  return map
}

/** Study bridges for one lesson (`/courses/{code}/{slug}`), [] for most lessons. */
export function getStudyBridgesForLesson(lessonHref: string): LessonStudyBridge[] {
  if (!cache) cache = buildMap()
  return cache.get(lessonHref) ?? []
}
