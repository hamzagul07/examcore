import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { getIbSubjects } from '@/lib/ib/catalog'
import type { Board } from '@/lib/community/posts'

export type CommunitySubject = {
  id: string
  name: string
  glyph: string
  accent: string
  board: Board
}

let cache: CommunitySubject[] | null = null

/** Unified, sorted list of every subject "subreddit" (Cambridge + IB). */
export function getCommunitySubjects(): CommunitySubject[] {
  if (cache) return cache
  const cambridge: CommunitySubject[] = adaptAllCatalogSubjects(getCourseCatalog()).map((s) => ({
    id: s.code,
    name: s.name,
    glyph: s.glyph,
    accent: accentCssVar(s.acc),
    board: 'cambridge' as const,
  }))
  const ib: CommunitySubject[] = getIbSubjects().map((s) => ({
    id: s.slug,
    name: `${s.name} ${s.level}`,
    glyph: s.glyph,
    accent: s.accent,
    board: 'ib' as const,
  }))
  cache = [...cambridge, ...ib].sort((a, b) => a.name.localeCompare(b.name))
  return cache
}

export function findCommunitySubject(id: string | null | undefined): CommunitySubject | null {
  if (!id) return null
  return getCommunitySubjects().find((s) => s.id === id) ?? null
}

export function boardForSubject(id: string): Board {
  return findCommunitySubject(id)?.board ?? 'cambridge'
}
