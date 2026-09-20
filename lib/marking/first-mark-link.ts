/**
 * The one link a brand-new student should follow: /mark with a real question
 * already loaded for their subject.
 *
 * 508 signups, 33 have ever uploaded a paper. Onboarding already sends new
 * users to /mark, but /mark greets them with an empty form and an *offer* of
 * a question; most read the courses instead and never come back to mark.
 * `?starter=1` turns the offer into the default: the page loads a banked
 * past-paper question for the subject, with its official scheme and its total,
 * so the first session ends with a marked answer rather than a course list.
 *
 * Only Cambridge syllabus codes have banked starters, so anything else drops
 * the subject and lets the page choose (it falls back to 9709, the most-visited
 * subject on the site).
 */
export const FIRST_MARK_QUERY_PARAM = 'starter'

const CAMBRIDGE_CODE = /^\d{4}$/

export function buildFirstMarkHref(subjectCode?: string | null): string {
  const code = subjectCode?.trim() ?? ''
  const params = new URLSearchParams({ [FIRST_MARK_QUERY_PARAM]: '1' })
  if (CAMBRIDGE_CODE.test(code)) params.set('subject', code)
  return `/mark?${params.toString()}`
}

/** True when a /mark URL asks for the guided first question. */
export function wantsFirstMark(search: string | URLSearchParams): boolean {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search
  return sp.get(FIRST_MARK_QUERY_PARAM) === '1'
}
