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

export const COMMUNITY_BOARDS = [
  {
    id: 'cambridge' as const,
    label: 'Cambridge A-Level',
    short: 'A-Level',
    sub: 'CAIE · 15 subjects',
    glyph: '🎓',
  },
  {
    id: 'ib' as const,
    label: 'IB Diploma',
    short: 'IB',
    sub: 'HL & SL programmes',
    glyph: '🌍',
  },
] as const

export function communityBoardMeta(board: Board) {
  return COMMUNITY_BOARDS.find((b) => b.id === board) ?? COMMUNITY_BOARDS[0]
}

let cache: CommunitySubject[] | null = null

/** Cambridge A-Level subjects only. */
export function getCambridgeCommunitySubjects(): CommunitySubject[] {
  return getCommunitySubjects().filter((s) => s.board === 'cambridge')
}

/** IB Diploma subjects only. */
export function getIbCommunitySubjects(): CommunitySubject[] {
  return getCommunitySubjects().filter((s) => s.board === 'ib')
}

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

export function getCommunitySubjectsForBoard(board: Board): CommunitySubject[] {
  return getCommunitySubjects().filter((s) => s.board === board)
}

export function findCommunitySubject(id: string | null | undefined): CommunitySubject | null {
  if (!id) return null
  return getCommunitySubjects().find((s) => s.id === id) ?? null
}

export function boardForSubject(id: string): Board {
  return findCommunitySubject(id)?.board ?? 'cambridge'
}
