/**
 * Which topics come up most — from the mark schemes we hold, not a guess.
 *
 * `mark_schemes.syllabus_tags` carries the leaf codes each question tests.
 * Counting the PAPERS a topic appears in (not the questions) is the honest
 * measure: a topic that is one question on every paper is high-yield; a topic
 * that is six questions on one paper is not. This is what the "I need to pass"
 * plan spends its hours on.
 *
 * Pure. The scan of mark_schemes lives in lib/plan/study-plan-service.ts.
 */

import type { PlanTopic } from '@/lib/plan/build-study-plan'

export type TaggedSchemeRow = {
  paper_code: string | null
  paper_session: string | null
  syllabus_tags: string[] | null
}

/**
 * Rank leaf codes by how many distinct papers they appear in.
 *
 * Only codes the resolver knows are counted: tagger output includes parent
 * codes and the odd stray, and a plan block pointing at "1" is not a topic.
 */
export function rankTagsByPaper(
  rows: TaggedSchemeRow[],
  nameOf: (code: string) => string | undefined,
  limit = 8
): PlanTopic[] {
  const papersByTag = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.paper_code || !row.syllabus_tags?.length) continue
    const paperKey = `${row.paper_code}|${row.paper_session ?? ''}`
    for (const tag of new Set(row.syllabus_tags)) {
      if (!nameOf(tag)) continue
      let set = papersByTag.get(tag)
      if (!set) {
        set = new Set()
        papersByTag.set(tag, set)
      }
      set.add(paperKey)
    }
  }

  return [...papersByTag.entries()]
    .map(([code, papers]) => ({ code, papers: papers.size }))
    .sort((a, b) => b.papers - a.papers || compareCodes(a.code, b.code))
    .slice(0, limit)
    .map((t) => ({
      code: t.code,
      name: nameOf(t.code) ?? t.code,
      source: 'high_yield' as const,
      weight: t.papers,
    }))
}

/** "1.10" sorts after "1.9": compare dotted codes numerically, segment by segment. */
function compareCodes(a: string, b: string): number {
  const as = a.split('.')
  const bs = b.split('.')
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = Number(as[i] ?? 0)
    const y = Number(bs[i] ?? 0)
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b)
    if (x !== y) return x - y
  }
  return 0
}
