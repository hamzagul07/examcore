import { getIbSubject } from '@/lib/ib/catalog'
import { ibCatalogSlug } from '@/lib/ib/slug-resolve'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'

export type IbCatalogCard = MarginNotesSubject & {
  href: string
  boardLabel: string
  accentHex: string
  /**
   * Short display code for the card tab ("BUS MGT · SL"). `code` is the course
   * folder slug, which the card must never print — "nglish-a-lang-lit-hl" was
   * what the tab showed once the slug outran its box.
   */
  codeLabel: string
  /** Recently launched course — show a “New” ribbon on catalog cards. */
  isNew?: boolean
}

/** One level of a merged IB subject card: the HL / SL segment in the card foot. */
export type SubjectCardLevel = {
  label: string
  href: string
  lessons?: number
  isNew?: boolean
}

/**
 * HL and SL folded into one catalog card. Every field is the representative
 * course's (HL when nothing is started, otherwise the level with progress) so
 * the card still keys, filters and pins by a real course slug; `levels` carries
 * both hrefs so nothing a student could reach before is lost.
 */
export type IbCatalogGroup = IbCatalogCard & { levels: SubjectCardLevel[] }

/** Course folder slug → the level it teaches, or null for Core (TOK, EE, CAS). */
export function ibLevelFromSlug(slug: string): 'HL' | 'SL' | null {
  const m = slug.match(/-(hl|sl)$/)
  return m ? (m[1].toUpperCase() as 'HL' | 'SL') : null
}

/** Course folder slug without its level suffix — the key HL and SL share. */
export function ibBaseSlug(slug: string): string {
  return slug.replace(/-(hl|sl)$/, '')
}

/**
 * Short codes for the card tab. IB has no numeric syllabus codes, so these are
 * the abbreviations students and schools actually use ("SEHS", "Math AA").
 */
const IB_SHORT_CODES: Record<string, string> = {
  'english-a-lang-lit': 'ENG A L&L',
  'english-a-literature': 'ENG A LIT',
  'spanish-b': 'SPA B',
  'french-b': 'FRE B',
  economics: 'ECON',
  'business-management': 'BUS MGT',
  history: 'HIST',
  geography: 'GEOG',
  psychology: 'PSYCH',
  'global-politics': 'GLOB POL',
  'digital-society': 'DIG SOC',
  biology: 'BIO',
  chemistry: 'CHEM',
  physics: 'PHYS',
  'computer-science': 'COMP SCI',
  'environmental-systems-and-societies': 'ESS',
  'sports-exercise-health-science': 'SEHS',
  'design-technology': 'DES TECH',
  'maths-aa': 'MATH AA',
  'maths-ai': 'MATH AI',
  'visual-arts': 'VIS ARTS',
  theatre: 'THEATRE',
  music: 'MUSIC',
  film: 'FILM',
  dance: 'DANCE',
  tok: 'TOK',
  'extended-essay': 'EE',
  cas: 'CAS',
}

/**
 * "ENG A L&L · HL" for a course slug. Unknown subjects fall back to initials
 * (or the first five letters of a one-word slug) so a new course folder can
 * never leak a raw slug onto a card.
 */
export function ibDisplayCode(slug: string, withLevel = true): string {
  const base = ibBaseSlug(slug)
  let short = IB_SHORT_CODES[base]
  if (!short) {
    const words = base.split('-').filter(Boolean)
    short =
      words.length > 1
        ? words.map((w) => w[0]).join('').toUpperCase()
        : (words[0] ?? '').slice(0, 5).toUpperCase()
  }
  const level = ibLevelFromSlug(slug)
  return withLevel && level ? `${short} · ${level}` : short
}

/**
 * Fold each subject's HL and SL cards into one, keeping first-seen order so a
 * student's pinned subjects stay at the top. The representative is the level
 * with the most progress, else HL; its `level` reads "HL · SL" and `isNew`
 * only survives when the whole subject is new, not just one level's batch.
 */
export function ibCatalogGroups<T extends IbCatalogCard>(cards: T[]): (T & { levels: SubjectCardLevel[] })[] {
  const byBase = new Map<string, T[]>()
  for (const c of cards) {
    const key = ibBaseSlug(c.code)
    const bucket = byBase.get(key)
    if (bucket) bucket.push(c)
    else byBase.set(key, [c])
  }
  const out: (T & { levels: SubjectCardLevel[] })[] = []
  for (const bucket of byBase.values()) {
    const ordered = [...bucket].sort(
      (a, b) => levelRank(ibLevelFromSlug(a.code)) - levelRank(ibLevelFromSlug(b.code))
    )
    const started = ordered.filter((c) => c.prog > 0).sort((a, b) => b.prog - a.prog)[0]
    const rep = started ?? ordered[0]
    if (ordered.length < 2) {
      out.push({ ...rep, levels: [] })
      continue
    }
    const levels: SubjectCardLevel[] = ordered.map((c) => ({
      label: ibLevelFromSlug(c.code) ?? c.level,
      href: c.href,
      lessons: c.lessons,
      isNew: c.isNew,
    }))
    out.push({
      ...rep,
      codeLabel: ibDisplayCode(rep.code, false),
      level: levels.map((l) => l.label).join(' · '),
      prog: Math.max(...ordered.map((c) => c.prog)),
      isNew: ordered.every((c) => c.isNew),
      levels,
    })
  }
  return out
}

function levelRank(level: 'HL' | 'SL' | null): number {
  return level === 'HL' ? 0 : level === 'SL' ? 1 : 2
}

/** Recently-launched course folder slugs — show a "New" ribbon on catalog cards. */
export const IB_NEW_COURSE_SLUGS = new Set([
  // June 2026 SL batch
  'biology-sl',
  'business-management-sl',
  'chemistry-sl',
  'computer-science-sl',
  'economics-sl',
  'environmental-systems-and-societies-sl',
  'maths-aa-sl',
  'maths-ai-sl',
  'psychology-sl',
  // New subjects (HL + SL)
  'global-politics-hl',
  'global-politics-sl',
  'digital-society-hl',
  'digital-society-sl',
  'sports-exercise-health-science-hl',
  'sports-exercise-health-science-sl',
  'design-technology-hl',
  'design-technology-sl',
])

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
  const g = getIbSubject(ibCatalogSlug(slug))?.groupNumber
  if (g === 7) return 'core'
  if (g === 6) return 'arts'
  if (g === 5) return 'maths'
  if (g === 4) return 'sciences'
  if (g === 3) return 'humanities'
  if (g === 1 || g === 2) return 'languages'
  return 'humanities'
}

/** Client-safe track grouping for IB catalog cards (no filesystem). */
export function ibCatalogCardsByTrack<T extends IbCatalogCard>(cards: T[]): Record<IbCatalogTrackKey, T[]> {
  const out: Record<IbCatalogTrackKey, T[]> = {
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

export function ibCatalogTrackSections<T extends IbCatalogCard>(cards: T[]): {
  key: IbCatalogTrackKey
  label: string
  items: T[]
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
