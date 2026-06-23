import { getIbSubject } from '@/lib/ib/catalog'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'

export type IbCatalogCard = MarginNotesSubject & {
  href: string
  boardLabel: string
  accentHex: string
}

export type IbCatalogTrackKey =
  | 'core'
  | 'languages'
  | 'humanities'
  | 'sciences'
  | 'maths'
  | 'arts'

export const IB_CATALOG_TRACK_LABELS: Record<IbCatalogTrackKey, string> = {
  core: 'Core — TOK, EE & CAS',
  languages: 'Groups 1 & 2 — English & languages',
  humanities: 'Group 3 — Individuals & societies',
  sciences: 'Group 4 — Sciences',
  maths: 'Group 5 — Mathematics',
  arts: 'Group 6 — The Arts',
}

export const IB_CATALOG_TRACK_ORDER: IbCatalogTrackKey[] = [
  'core',
  'languages',
  'humanities',
  'sciences',
  'maths',
  'arts',
]

function trackKeyForSlug(slug: string): IbCatalogTrackKey {
  const g = getIbSubject(slug)?.groupNumber
  if (g === 7) return 'core'
  if (g === 6) return 'arts'
  if (g === 5) return 'maths'
  if (g === 4) return 'sciences'
  if (g === 3) return 'humanities'
  if (g === 1 || g === 2) return 'languages'
  return 'humanities'
}

/** Client-safe track grouping for IB catalog cards (no filesystem). */
export function ibCatalogCardsByTrack(cards: IbCatalogCard[]): Record<IbCatalogTrackKey, IbCatalogCard[]> {
  const out: Record<IbCatalogTrackKey, IbCatalogCard[]> = {
    core: [],
    languages: [],
    humanities: [],
    sciences: [],
    maths: [],
    arts: [],
  }
  for (const c of cards) {
    out[trackKeyForSlug(c.code)].push(c)
  }
  return out
}

export function ibCatalogTrackSections(cards: IbCatalogCard[]): {
  key: IbCatalogTrackKey
  label: string
  items: IbCatalogCard[]
}[] {
  const tracks = ibCatalogCardsByTrack(cards)
  return IB_CATALOG_TRACK_ORDER.map((key) => ({
    key,
    label: IB_CATALOG_TRACK_LABELS[key],
    items: tracks[key],
  })).filter((t) => t.items.length > 0)
}

/** Group course hub entries (slug + lessonCount) for /ib hub grids. */
export function ibCourseEntriesByTrack<T extends { code: string }>(
  entries: T[]
): { key: IbCatalogTrackKey; label: string; items: T[] }[] {
  const buckets: Record<IbCatalogTrackKey, T[]> = {
    core: [],
    languages: [],
    humanities: [],
    sciences: [],
    maths: [],
    arts: [],
  }
  for (const e of entries) {
    buckets[trackKeyForSlug(e.code)].push(e)
  }
  return IB_CATALOG_TRACK_ORDER.map((key) => ({
    key,
    label: IB_CATALOG_TRACK_LABELS[key],
    items: buckets[key],
  })).filter((t) => t.items.length > 0)
}

/** Shared catalog blurb — keep in sync across /courses and /ib. */
export const IB_COURSES_CATALOG_BLURB =
  'TOK, Extended Essay, CAS, English, languages, history, geography, sciences, maths, and Group 6 arts — criterion-based marking on every topic.'
