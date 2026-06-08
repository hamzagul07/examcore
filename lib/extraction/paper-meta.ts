import { seasonNameFromSessionCode } from '@/lib/marking/session'

export type PaperKind = 'mcq' | 'practical' | 'structured'

export type ParsedPaperMeta = {
  storagePrefix: string
  subjectCode: string
  sessionCode: string
  session: string
  year: number
  component: string
  paperNumber: string
  variant: string
  paperKind: PaperKind
  sourcePdfPath: string
}

const QP_PATH_RE = /^([^/]+)\/(\d{4})\/([smw]\d{2})\/qp_(\d{2})\.pdf$/i
const MS_PATH_RE = /^([^/]+)\/(\d{4})\/([smw]\d{2})\/ms_(\d{2})\.pdf$/i

export type ParsedMarkSchemeMeta = ParsedPaperMeta & {
  pdfKind: 'mark-scheme'
}

export function paperNumberFromComponent(component: string): string {
  const n = parseInt(component, 10)
  if (Number.isNaN(n)) return component
  return n >= 10 ? String(Math.floor(n / 10)) : String(n)
}

export function detectPaperKind(component: string): PaperKind {
  const paper = parseInt(paperNumberFromComponent(component), 10)
  if (paper === 1) return 'mcq'
  if (paper === 3) return 'practical'
  return 'structured'
}

function buildPaperMeta(
  match: RegExpMatchArray,
  sourcePdfPath: string
): ParsedPaperMeta {
  const sessionCode = match[3].toLowerCase()
  const year = 2000 + parseInt(sessionCode.slice(1), 10)
  const session = seasonNameFromSessionCode(sessionCode) ?? sessionCode
  const component = match[4]

  return {
    storagePrefix: match[1],
    subjectCode: match[2],
    sessionCode,
    session,
    year,
    component,
    paperNumber: paperNumberFromComponent(component),
    variant: component,
    paperKind: detectPaperKind(component),
    sourcePdfPath,
  }
}

/** Corresponding question-paper path for a mark scheme path. */
export function questionPaperPathFromMarkScheme(msPath: string): string | null {
  const normalized = msPath.replace(/^\/+/, '').trim()
  const match = normalized.match(MS_PATH_RE)
  if (!match) return null
  return `${match[1]}/${match[2]}/${match[3]}/qp_${match[4]}.pdf`
}

/** Parse `cambridge/9702/s24/ms_42.pdf` → metadata. */
export function parseMarkSchemePath(sourcePdfPath: string): ParsedMarkSchemeMeta | null {
  const normalized = sourcePdfPath.replace(/^\/+/, '').trim()
  const match = normalized.match(MS_PATH_RE)
  if (!match) return null
  return { ...buildPaperMeta(match, normalized), pdfKind: 'mark-scheme' }
}

/** Parse `cambridge/9702/s24/qp_32.pdf` → metadata. */
export function parseQuestionPaperPath(sourcePdfPath: string): ParsedPaperMeta | null {
  const normalized = sourcePdfPath.replace(/^\/+/, '').trim()
  const match = normalized.match(QP_PATH_RE)
  if (!match) return null

  return buildPaperMeta(match, normalized)
}
