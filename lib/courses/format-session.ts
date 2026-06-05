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
