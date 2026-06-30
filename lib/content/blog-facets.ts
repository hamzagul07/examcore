import 'server-only'

import { getBlogPosts } from '@/lib/blog'
import {
  BOARDS,
  IB_CORE_STRANDS,
  resolveBoardMeta,
  type Board,
  type Level,
} from '@/lib/content/taxonomy'

export type BoardSubjectEntry = {
  value: string
  count: number
  /** IB Core strand (TOK/EE/CAS) surfaced as a first-class facet */
  core: boolean
  /** Levels present for this subject — only populated when ≥2 (so a level facet
   *  actually disambiguates; single-level subjects get no thin level pages). */
  levels: { value: Level; count: number }[]
}

/** Subjects (incl. IB Core strands) that have ≥1 post for the given board. */
export function getBoardSubjects(board: Board): BoardSubjectEntry[] {
  const subjects = new Map<string, { count: number; levels: Map<string, number> }>()
  for (const p of getBlogPosts()) {
    const m = resolveBoardMeta(p.slug, p)
    if (m.board !== board || !m.subject) continue
    const entry = subjects.get(m.subject) ?? { count: 0, levels: new Map() }
    entry.count += 1
    if (m.level) entry.levels.set(m.level, (entry.levels.get(m.level) ?? 0) + 1)
    subjects.set(m.subject, entry)
  }
  return [...subjects.entries()].map(([value, e]) => ({
    value,
    count: e.count,
    core: board === 'ib' && (IB_CORE_STRANDS as string[]).includes(value),
    levels:
      e.levels.size >= 2
        ? [...e.levels.entries()].map(([lvl, count]) => ({ value: lvl as Level, count }))
        : [],
  }))
}

/** Every browse facet tuple: [board], [board, subject], [board, subject, level].
 *  Single source of truth for generateStaticParams and the sitemap. */
export function getAllBlogBrowseFacets(): string[][] {
  const out: string[][] = []
  for (const board of BOARDS) {
    out.push([board])
    for (const s of getBoardSubjects(board)) {
      out.push([board, s.value])
      for (const lvl of s.levels) out.push([board, s.value, lvl.value])
    }
  }
  return out
}
