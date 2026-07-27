/**
 * Carrying a written answer from a lesson to the marker.
 *
 * A student who has just typed an answer into a quick check is the closest
 * anyone gets to wanting a real mark, and until now that moment threw the words
 * away: the bridge to /mark handed over a past-paper question and an empty
 * page. Now that answers can be typed rather than photographed, the words
 * themselves can make the trip.
 *
 * Kept in sessionStorage rather than the URL. A full answer is hundreds of
 * characters of the student's own prose — it does not belong in a query string
 * that lands in history, referrer headers and any analytics in between, and it
 * would sit near enough to URL length limits to truncate somebody's work.
 *
 * Pure apart from the storage calls, so the validation and one-shot behaviour
 * are testable.
 */

export const MARK_HANDOFF_KEY = 'ms:mark-handoff'
/** Marks the navigation as a handoff, so /mark only looks when it should. */
export const MARK_HANDOFF_PARAM = 'from'
export const MARK_HANDOFF_VALUE = 'lesson'

/** Generous next to a quick-check answer, far below the ~5MB storage budget. */
export const MAX_ANSWER_CHARS = 20_000

export type MarkHandoff = {
  question: string
  answer: string
  /** Cambridge numeric code or IB subject code; omitted when unknown. */
  subjectCode?: string | null
  /** Where to send the student back to once they are done. */
  returnPath?: string | null
  /** Marks the question is out of, when the lesson knows. */
  totalMarks?: number | null
  /** IB only. The marker picks subject and level separately, so a lesson code
   *  like "ib-biology-hl" has to arrive split. */
  ibLevel?: 'HL' | 'SL' | null
}

/**
 * Split a course subject code into the shape the marker expects.
 *
 * Lessons are keyed by level ("ib-biology-hl") and the marker's subject picker
 * is not ("ib-biology" plus an HL/SL control). Sending the lesson's code
 * straight through selected nothing at all, silently.
 */
export function splitSubjectLevel(code: string | null | undefined): {
  subjectCode: string | null
  ibLevel: 'HL' | 'SL' | null
} {
  const c = code?.trim()
  if (!c) return { subjectCode: null, ibLevel: null }
  const m = c.match(/^(.*)-(hl|sl)$/i)
  if (!m) return { subjectCode: c, ibLevel: null }
  return {
    subjectCode: m[1]!,
    ibLevel: m[2]!.toUpperCase() === 'HL' ? 'HL' : 'SL',
  }
}

/**
 * A handoff is only worth making if there is a real question AND a real answer.
 *
 * Prefilling one without the other lands the student in a half-filled form
 * they did not ask for, which is worse than the clean page they expected.
 */
export function isUsableHandoff(h: Partial<MarkHandoff> | null | undefined): h is MarkHandoff {
  if (!h) return false
  const q = typeof h.question === 'string' ? h.question.trim() : ''
  const a = typeof h.answer === 'string' ? h.answer.trim() : ''
  return q.length >= 10 && a.length >= 12
}

export function serializeHandoff(h: MarkHandoff): string {
  return JSON.stringify({
    ...h,
    question: h.question.trim().slice(0, MAX_ANSWER_CHARS),
    answer: h.answer.trim().slice(0, MAX_ANSWER_CHARS),
  })
}

/** Tolerant: a corrupt handoff must mean a normal /mark page, never a crash. */
export function parseHandoff(raw: string | null | undefined): MarkHandoff | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const h = data as Partial<MarkHandoff>
  if (!isUsableHandoff(h)) return null
  return {
    question: h.question.trim().slice(0, MAX_ANSWER_CHARS),
    answer: h.answer.trim().slice(0, MAX_ANSWER_CHARS),
    subjectCode: typeof h.subjectCode === 'string' && h.subjectCode ? h.subjectCode : null,
    returnPath: typeof h.returnPath === 'string' && h.returnPath ? h.returnPath : null,
    totalMarks:
      typeof h.totalMarks === 'number' && Number.isFinite(h.totalMarks) && h.totalMarks > 0
        ? Math.round(h.totalMarks)
        : null,
    ibLevel: h.ibLevel === 'HL' || h.ibLevel === 'SL' ? h.ibLevel : null,
  }
}

/** Store a handoff and return the URL to send the student to. */
export function stashHandoff(h: MarkHandoff, markHref = '/mark'): string {
  try {
    window.sessionStorage.setItem(MARK_HANDOFF_KEY, serializeHandoff(h))
  } catch {
    // Private mode or a full quota: the link still works, it just arrives empty
    // rather than failing to navigate.
  }
  const [base, query = ''] = markHref.split('?')
  const params = new URLSearchParams(query)
  params.set(MARK_HANDOFF_PARAM, MARK_HANDOFF_VALUE)
  return `${base}?${params.toString()}`
}

/**
 * Read a handoff exactly once.
 *
 * Cleared on read so that going back to /mark later, or reloading after
 * submitting, does not silently refill the form with an answer the student has
 * already dealt with.
 */
export function takeHandoff(): MarkHandoff | null {
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(MARK_HANDOFF_KEY)
    window.sessionStorage.removeItem(MARK_HANDOFF_KEY)
  } catch {
    return null
  }
  return parseHandoff(raw)
}
