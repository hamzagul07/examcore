import type { Board } from '@/lib/community/posts'
import type { CommunitySubject } from '@/lib/community/subjects'

const POPULAR_LIMIT = 8

/** Top subject room ids per board by post count, then name. */
export function popularSubjectIdsByBoard(
  subjects: Pick<CommunitySubject, 'id' | 'name' | 'board'>[],
  counts: Record<string, number>
): Partial<Record<Board, string[]>> {
  const out: Partial<Record<Board, string[]>> = {}
  for (const board of ['cambridge', 'ib'] as const) {
    const pool = subjects.filter((s) => s.board === board)
    out[board] = [...pool]
      .sort(
        (a, b) =>
          (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)
      )
      .slice(0, POPULAR_LIMIT)
      .map((s) => s.id)
  }
  return out
}
