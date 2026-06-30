// Canonical board / subject / level taxonomy shared by content (blog, guides)
// and, in later increments, lessons. Board metadata is read from frontmatter
// when present and otherwise inferred from the slug, so all existing posts
// resolve without a backfill. Pure string logic — safe in server and client.

export type Board = 'cambridge' | 'ib'
export type Level = 'hl' | 'sl' | 'alevel' | 'olevel' | 'igcse'
export type Strand = 'tok' | 'ee' | 'cas' | 'ia'

export const BOARDS: Board[] = ['cambridge', 'ib']

export const BOARD_LABELS: Record<Board, string> = {
  cambridge: 'Cambridge',
  ib: 'IB Diploma',
}

export const LEVEL_LABELS: Record<Level, string> = {
  hl: 'HL',
  sl: 'SL',
  alevel: 'A-Level',
  olevel: 'O-Level',
  igcse: 'IGCSE',
}

export const STRAND_LABELS: Record<Strand, string> = {
  tok: 'Theory of Knowledge',
  ee: 'Extended Essay',
  cas: 'CAS',
  ia: 'Internal Assessment',
}

/** IB Core strands surfaced as first-class peers to subjects. */
export const IB_CORE_STRANDS: Strand[] = ['tok', 'ee', 'cas']

export type BoardMeta = {
  board: Board | null
  subject: string | null
  level: Level | null
  strand: Strand | null
}

export type BoardFrontmatter = {
  board?: string
  subject?: string
  level?: string
  strand?: string
}

const asBoard = (v?: string): Board | null =>
  v === 'cambridge' || v === 'ib' ? v : null
const asLevel = (v?: string): Level | null =>
  v === 'hl' || v === 'sl' || v === 'alevel' || v === 'olevel' || v === 'igcse'
    ? v
    : null
const asStrand = (v?: string): Strand | null =>
  v === 'tok' || v === 'ee' || v === 'cas' || v === 'ia' ? v : null

function inferBoard(slug: string): Board | null {
  if (slug.startsWith('ib-')) return 'ib'
  if (slug.startsWith('cambridge-')) return 'cambridge'
  return null
}

function inferStrand(slug: string): Strand | null {
  if (/(^|-)tok(-|$)/.test(slug)) return 'tok'
  if (slug.includes('extended-essay')) return 'ee'
  if (/(^|-)cas(-|$)/.test(slug)) return 'cas'
  if (slug.endsWith('-ia-guide')) return 'ia'
  return null
}

function inferLevel(slug: string, board: Board | null): Level | null {
  if (board === 'ib') {
    if (/-hl(-|$)/.test(slug)) return 'hl'
    if (/-sl(-|$)/.test(slug)) return 'sl'
    return null
  }
  if (board === 'cambridge') {
    if (slug.includes('igcse')) return 'igcse'
    if (slug.includes('o-level') || slug.includes('olevel')) return 'olevel'
    if (slug.includes('a-level') || slug.includes('alevel')) return 'alevel'
    return null
  }
  return null
}

function inferSubject(slug: string, board: Board | null): string | null {
  if (board === 'cambridge') {
    const m = slug.match(/cambridge-(\d{4})/i)
    return m?.[1] ?? null
  }
  if (board === 'ib') {
    // ib-<subject>-hl-..., ib-<subject>-sl-..., ib-<subject>-ia-guide
    const m = slug.match(/^ib-([a-z0-9-]+?)-(?:hl|sl|ia)\b/)
    return m?.[1] ?? null
  }
  return null
}

/**
 * Resolve a post's board taxonomy. Frontmatter wins; slug inference fills the
 * gaps. A null board means cross-board / general content (e.g. study skills),
 * which the filter treats as relevant to every board.
 */
export function resolveBoardMeta(slug: string, fm: BoardFrontmatter = {}): BoardMeta {
  const board = asBoard(fm.board) ?? inferBoard(slug)
  const strand = asStrand(fm.strand) ?? inferStrand(slug)
  const level = asLevel(fm.level) ?? inferLevel(slug, board)
  const subject =
    fm.subject?.trim() || inferSubject(slug, board) || (strand ?? null)
  return { board, subject, level, strand }
}

/** A general (no-board) post is relevant to every board filter. */
export function matchesBoard(meta: BoardMeta, board: Board): boolean {
  return meta.board === board || meta.board === null
}
