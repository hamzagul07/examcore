/**
 * Syllabus graph edges — prerequisites / related / next / confused_with.
 * Seeded from positional neighbors + optional overrides in content/data/syllabus-edges.json.
 */
import fs from 'fs'
import path from 'path'
import { getCourseLessons } from '@/lib/courses'
import { isIndexableLesson, caieLessonPath } from '@/lib/seo/caie-graph'
import type { CourseLesson } from '@/lib/courses/types'

export type SyllabusEdgeKind = 'prerequisites' | 'related' | 'next_topics' | 'confused_with'

export type SyllabusEdgeOverride = {
  board?: 'cambridge' | 'ib'
  syllabus_code: string
  topic_code: string
  prerequisites?: string[]
  related?: string[]
  next_topics?: string[]
  confused_with?: string[]
}

export type ResolvedEdgeLink = {
  topicCode: string
  title: string
  slug: string
  href: string
}

type EdgeFile = { edges?: SyllabusEdgeOverride[] }

const EDGE_FILE = path.join(process.cwd(), 'content', 'data', 'syllabus-edges.json')

let cachedOverrides: Map<string, SyllabusEdgeOverride> | null = null

function overrideKey(code: string, topicCode: string) {
  return `${code}::${topicCode}`
}

function loadOverrides(): Map<string, SyllabusEdgeOverride> {
  if (cachedOverrides) return cachedOverrides
  const map = new Map<string, SyllabusEdgeOverride>()
  if (fs.existsSync(EDGE_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(EDGE_FILE, 'utf8')) as EdgeFile
      for (const e of raw.edges ?? []) {
        map.set(overrideKey(e.syllabus_code, e.topic_code), e)
      }
    } catch {
      /* ignore malformed */
    }
  }
  cachedOverrides = map
  return map
}

function lessonByTopic(code: string, topicCode: string): CourseLesson | null {
  return (
    getCourseLessons(code).find(
      (l) => isIndexableLesson(l) && l.topicCode === topicCode
    ) ?? null
  )
}

function toLink(code: string, lesson: CourseLesson): ResolvedEdgeLink | null {
  const href = caieLessonPath(code, lesson.slug) ?? `/courses/${code}/${lesson.slug}`
  return {
    topicCode: lesson.topicCode,
    title: lesson.title,
    slug: lesson.slug,
    href,
  }
}

function resolveCodes(
  code: string,
  topicCodes: string[] | undefined
): ResolvedEdgeLink[] {
  if (!topicCodes?.length) return []
  const out: ResolvedEdgeLink[] = []
  for (const tc of topicCodes) {
    const lesson = lessonByTopic(code, tc)
    if (!lesson) continue
    const link = toLink(code, lesson)
    if (link) out.push(link)
  }
  return out
}

/** Positional fallback when no authored edges exist. */
function positionalNeighbors(
  code: string,
  topicCode: string
): {
  prerequisites: ResolvedEdgeLink[]
  related: ResolvedEdgeLink[]
  next_topics: ResolvedEdgeLink[]
  confused_with: ResolvedEdgeLink[]
} {
  const lessons = getCourseLessons(code).filter(isIndexableLesson)
  const idx = lessons.findIndex((l) => l.topicCode === topicCode)
  if (idx < 0) {
    return { prerequisites: [], related: [], next_topics: [], confused_with: [] }
  }
  const prev = idx > 0 ? toLink(code, lessons[idx - 1]) : null
  const next = idx < lessons.length - 1 ? toLink(code, lessons[idx + 1]) : null
  const related = lessons
    .slice(Math.max(0, idx - 2), idx + 3)
    .filter((_, i, arr) => {
      const absolute = Math.max(0, idx - 2) + i
      return absolute !== idx
    })
    .map((l) => toLink(code, l))
    .filter((l): l is ResolvedEdgeLink => Boolean(l))
    .slice(0, 4)

  return {
    prerequisites: prev ? [prev] : [],
    related,
    next_topics: next ? [next] : [],
    confused_with: [],
  }
}

export function getSyllabusEdges(
  code: string,
  topicCode: string
): {
  prerequisites: ResolvedEdgeLink[]
  related: ResolvedEdgeLink[]
  next_topics: ResolvedEdgeLink[]
  confused_with: ResolvedEdgeLink[]
} {
  const ov = loadOverrides().get(overrideKey(code, topicCode))
  const fallback = positionalNeighbors(code, topicCode)
  if (!ov) return fallback

  return {
    prerequisites: resolveCodes(code, ov.prerequisites).length
      ? resolveCodes(code, ov.prerequisites)
      : fallback.prerequisites,
    related: resolveCodes(code, ov.related).length
      ? resolveCodes(code, ov.related)
      : fallback.related,
    next_topics: resolveCodes(code, ov.next_topics).length
      ? resolveCodes(code, ov.next_topics)
      : fallback.next_topics,
    confused_with: resolveCodes(code, ov.confused_with),
  }
}
