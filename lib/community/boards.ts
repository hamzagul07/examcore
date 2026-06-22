import type { Board } from '@/lib/community/posts'

/** Board picker metadata — safe for client components. */
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
