/**
 * Supabase Storage layout for past-paper PDFs (`paper-pdfs` bucket).
 *
 *   {prefix}/{subjectCode}/{sessionCode}/{qp|ms}_{component}.pdf
 *
 * A-Level papers live under `cambridge/`; O-Level under `cambridge-o-level/`.
 * IB Diploma papers live under `ib/` keyed by subject SLUG (e.g.
 *   ib/biology-hl/may-2024/qp_1.pdf  — component is the paper number (1|2|3).
 */

export const PAPER_STORAGE_PREFIXES = {
  'A-Level': 'cambridge',
  'AS Level': 'cambridge',
  'O-Level': 'cambridge-o-level',
} as const

export type PaperLevel = keyof typeof PAPER_STORAGE_PREFIXES

export const IB_STORAGE_PREFIX = 'ib' as const

export const ALL_PAPER_STORAGE_PREFIXES = [
  'cambridge',
  'cambridge-o-level',
  IB_STORAGE_PREFIX,
] as const

/** IB session display name → storage slug, e.g. "May 2024" -> "may-2024". */
export function ibSessionSlug(session: string): string {
  return session.trim().toLowerCase().replace(/\s+/g, '-')
}

/** IB paper PDF path: ib/{slug}/{sessionSlug}/{qp|ms}_{paper}.pdf */
export function ibPaperPdfPath(
  subjectSlug: string,
  session: string,
  kind: 'qp' | 'ms',
  paper: string
): string {
  return `${IB_STORAGE_PREFIX}/${subjectSlug}/${ibSessionSlug(session)}/${kind}_${paper}.pdf`
}

export type PaperStoragePrefix = (typeof ALL_PAPER_STORAGE_PREFIXES)[number]

export function storagePrefixForLevel(level: string): PaperStoragePrefix {
  return (
    PAPER_STORAGE_PREFIXES[level as PaperLevel] ??
    ('cambridge' as PaperStoragePrefix)
  )
}

export function paperPdfPath(
  storagePrefix: string,
  subjectCode: string,
  sessionCode: string,
  kind: 'qp' | 'ms',
  component: string
): string {
  return `${storagePrefix}/${subjectCode}/${sessionCode}/${kind}_${component}.pdf`
}

export function paperPdfPathForLevel(
  level: string,
  subjectCode: string,
  sessionCode: string,
  kind: 'qp' | 'ms',
  component: string
): string {
  return paperPdfPath(
    storagePrefixForLevel(level),
    subjectCode,
    sessionCode,
    kind,
    component
  )
}
