/** Human-readable label for Cambridge storage session codes (s23, w24, m22). */
export function formatPaperSession(session: string): string {
  const trimmed = session.trim()
  if (!trimmed) return 'Cambridge past paper'

  const compact = trimmed.match(/^([smw])(\d{2})$/i)
  if (compact) {
    const series =
      compact[1].toLowerCase() === 's'
        ? 'June'
        : compact[1].toLowerCase() === 'w'
          ? 'November'
          : 'March'
    const year = 2000 + parseInt(compact[2], 10)
    return `${series} ${year}`
  }

  if (/may|june|november|march|october/i.test(trimmed)) return trimmed
  return trimmed
}

export function buildMarkHref(
  subjectCode: string,
  paperCode: string,
  paperSession: string,
  questionNumber: string
): string {
  const params = new URLSearchParams({
    subject: subjectCode,
    paper: paperCode,
    session: paperSession,
    question: questionNumber,
  })
  return `/mark?${params.toString()}`
}

/**
 * Closes the learn→practice→mark loop: appends a `return` path (and `topic`
 * attribution) to a `/mark` href so the student lands back on the lesson after
 * being marked. No-op for params that are already present.
 */
export function appendMarkReturn(
  href: string,
  returnPath: string | null | undefined,
  topicCode?: string | null
): string {
  if (!href) return href
  const [base, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  if (returnPath && !params.get('return')) params.set('return', returnPath)
  if (topicCode && !params.get('topic')) params.set('topic', topicCode)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * Tag a /mark deep-link so study-path → mark volume is visible in UTM columns
 * and funnel scorecards (board conversion metrics).
 */
export function appendStudyPathAttribution(
  href: string,
  board: string
): string {
  if (!href) return href
  const [base, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  if (!params.get('utm_source')) params.set('utm_source', 'study_path')
  if (!params.get('utm_medium')) params.set('utm_medium', 'lesson')
  if (!params.get('utm_campaign')) {
    params.set('utm_campaign', board.trim().toLowerCase().slice(0, 32) || 'board')
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
