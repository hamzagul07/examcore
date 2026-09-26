/**
 * The Sets tab's list: which sets are Open, Closed or Drafts, in what order,
 * and the keyset cursor that pages through them
 * (docs/TEACHER_SYSTEM_SPEC.md §3 `GET T/assignments ?status&cursor`).
 *
 * Status is assignmentStatus() (CONTRACTS ruling 14 — auto-close included),
 * so it cannot be pushed into SQL without re-deriving it. A class has a few
 * hundred sets at most, so the loader reads every set's timing columns and
 * this module filters, sorts and pages them. The cursor is still a keyset
 * (the last row's sort key plus its id, never an offset): a set published or
 * closed between two pages neither repeats nor pushes another off the list.
 *
 * Deleted sets (archived_at) are on no tab. Orders, per tab:
 *
 *   open    soonest due first (no due date last), then newest published
 *   closed  most recently closed first
 *   draft   most recently edited first
 *   (none)  newest created first
 *
 * Pure: no I/O; `now` is passed in.
 */

import { assignmentStatus, effectiveCloseAt } from '@/lib/teacher/assignment-status'
import type { Assignment } from '@/lib/teacher/types'

export type ListStatus = 'open' | 'closed' | 'draft'
export type ListScope = ListStatus | 'all'

export const LIST_PAGE_SIZE = 20
export const MAX_LIST_PAGE_SIZE = 50

export type ListRow = Pick<
  Assignment,
  'id' | 'published_at' | 'closed_at' | 'archived_at' | 'due_at' | 'created_at' | 'updated_at'
>

/** `?status=` → a tab, undefined for none, null for anything else. */
export function parseListStatus(raw: string | null | undefined): ListStatus | undefined | null {
  if (raw === null || raw === undefined || raw === '') return undefined
  return raw === 'open' || raw === 'closed' || raw === 'draft' ? raw : null
}

export function clampListLimit(raw: string | null | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return LIST_PAGE_SIZE
  return Math.min(n, MAX_LIST_PAGE_SIZE)
}

// Sort keys are numbers ascending; "desc" columns are negated. A missing
// timestamp sorts last. JSON cannot carry Infinity, hence the sentinel.
const LAST = Number.MAX_SAFE_INTEGER

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

function asc(iso: string | null | undefined): number {
  return ms(iso) ?? LAST
}

function desc(iso: string | null | undefined): number {
  const t = ms(iso)
  return t === null ? LAST : -t
}

/** The row's sort key on a tab; compared element by element, then by id. */
export function listSortKey(row: ListRow, scope: ListScope): number[] {
  switch (scope) {
    case 'open':
      return [asc(row.due_at), desc(row.published_at)]
    case 'closed':
      return [desc(effectiveCloseAt(row) ?? row.archived_at)]
    case 'draft':
      return [desc(row.updated_at ?? row.created_at)]
    case 'all':
      return [desc(row.created_at)]
  }
}

function compareKeys(a: readonly number[], aId: string, b: readonly number[], bId: string): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return aId < bId ? -1 : aId > bId ? 1 : 0
}

export type ListCursor = { scope: ListScope; key: number[]; id: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Opaque to clients: base64url JSON `[scope, key, id]`. */
export function encodeListCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify([cursor.scope, cursor.key, cursor.id]), 'utf8').toString('base64url')
}

/**
 * The cursor, or null when it is malformed or belongs to another tab (a
 * cursor from Open is meaningless on Closed, so it is refused, not guessed).
 */
export function decodeListCursor(raw: string | null | undefined, scope: ListScope): ListCursor | null {
  if (!raw || raw.length > 300) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!Array.isArray(parsed) || parsed.length !== 3) return null
    const [s, key, id] = parsed
    if (s !== scope || !UUID_RE.test(String(id))) return null
    if (!Array.isArray(key) || key.length === 0 || key.length > 4) return null
    if (!key.every((k) => typeof k === 'number' && Number.isFinite(k))) return null
    return { scope, key: key as number[], id: String(id).toLowerCase() }
  } catch {
    return null
  }
}

/**
 * One page of a class's sets on a tab: filtered by status at `now`, sorted,
 * strictly after `cursor`. `next_cursor` is null on the last page.
 */
export function pageSets<T extends ListRow>(
  rows: readonly T[],
  opts: { status?: ListStatus; cursor?: ListCursor | null; limit: number; now: Date }
): { page: T[]; next_cursor: string | null } {
  const scope: ListScope = opts.status ?? 'all'
  const keyed = rows
    .filter((r) => !r.archived_at)
    .filter((r) => !opts.status || assignmentStatus(r, opts.now) === opts.status)
    .map((r) => ({ row: r, key: listSortKey(r, scope), id: r.id.toLowerCase() }))
    .sort((a, b) => compareKeys(a.key, a.id, b.key, b.id))

  const after = opts.cursor
    ? keyed.filter((k) => compareKeys(k.key, k.id, opts.cursor!.key, opts.cursor!.id) > 0)
    : keyed
  const limit = Math.max(1, Math.floor(opts.limit))
  const page = after.slice(0, limit)
  const last = page[page.length - 1]
  return {
    page: page.map((k) => k.row),
    next_cursor: after.length > limit && last ? encodeListCursor({ scope, key: last.key, id: last.id }) : null,
  }
}
