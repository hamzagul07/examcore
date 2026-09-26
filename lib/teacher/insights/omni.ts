/**
 * What a teacher page tells the Omni assistant, and what the assistant may
 * link back to (docs/TEACHER_SYSTEM_SPEC.md §3 `/api/omni-ai`, §8 "Omni").
 *
 * The client never describes the class. A teacher page sends only its
 * address — `{ classroom_id, view }` under `context.data` — and the server
 * proves ownership and loads the class itself (lib/omni-ai/teacher-context.ts).
 * Anything else a client puts in `context.data` is ignored for teacher views,
 * so a crafted body cannot put words into the teacher's prompt.
 *
 * The other half of the rule is on the way out: a `render_cta` the model
 * writes for a teacher may only point at a same-origin page under /teacher/.
 * lib/omni-ai/actions.ts already drops anything that is not a same-origin
 * path; `teacherCtaHref` narrows that to the teacher's own pages, because a
 * prompt that carries student-written text should never be able to send the
 * teacher to, say, /auth/signout or a student-facing flow. The same filter
 * guards links in the answer's prose: the teacher chat renders it with
 * teacherCtaHref as RichTextRenderer's `linkFilter` (ChatPanel), so a link the
 * model was steered into writing shows as text, not as an anchor.
 *
 * Pure and dependency-light: safe in client components (the page islands
 * import `teacherOmniContext`) and on the server.
 */

import { isSafeRelativeHref } from '@/lib/omni-ai/actions'
import type { AIContextType, OmniAIAction } from '@/lib/omni-ai/types'
import { isUuid } from '@/lib/teacher/assignments/validate'

/** The teacher pages Omni can be opened from. Cosmetic: it only steers the prompt's emphasis. */
export const TEACHER_OMNI_VIEWS = [
  'desk',
  'week',
  'sets',
  'students',
  'student',
  'gaps',
  'reviews',
  'settings',
] as const

export type TeacherOmniView = (typeof TEACHER_OMNI_VIEWS)[number]

export function isTeacherOmniView(value: unknown): value is TeacherOmniView {
  return typeof value === 'string' && (TEACHER_OMNI_VIEWS as readonly string[]).includes(value)
}

/** What a class page sends: its classroom and which page it is. Nothing else. */
export type TeacherOmniAddress = { classroomId: string | null; view: TeacherOmniView }

/**
 * The `context.data` a teacher page sends. Plain data, typed loosely on
 * purpose: the wire shape is owned and validated by the server
 * (parseTeacherOmniRequest), which ignores every other key.
 */
export function teacherOmniContextData(address: TeacherOmniAddress): Record<string, string> {
  const data: Record<string, string> = { view: address.view }
  if (address.view !== 'desk' && address.classroomId && isUuid(address.classroomId)) {
    data.classroom_id = address.classroomId.toLowerCase()
  }
  return data
}

/** The Omni context a teacher page sets on mount (see TeacherOmniContext). */
export function teacherOmniContext(address: TeacherOmniAddress): AIContextType {
  return { type: 'teacher_dashboard', data: teacherOmniContextData(address) }
}

/** Views that are not about one class: the desk, and the review inbox across every class. */
const CLASSLESS_VIEWS: ReadonlySet<TeacherOmniView> = new Set<TeacherOmniView>(['desk', 'reviews'])

/**
 * Resolves the address a page sent, defaulting what is missing: a class page
 * without a view is the class week; a class view without a valid classroom
 * falls back to the desk; the desk never carries a classroom. `classroom_id`
 * is validated strictly by the caller (a malformed one is a bad request, not
 * a desk) — here an invalid one simply counts as absent.
 */
export function resolveTeacherOmniAddress(input: { classroomId: string | null; view: unknown }): TeacherOmniAddress {
  const classroomId = input.classroomId && isUuid(input.classroomId) ? input.classroomId.toLowerCase() : null
  const view: TeacherOmniView = isTeacherOmniView(input.view) ? input.view : classroomId ? 'week' : 'desk'
  if (view === 'desk') return { classroomId: null, view }
  if (!classroomId) return { classroomId: null, view: CLASSLESS_VIEWS.has(view) ? view : 'desk' }
  return { classroomId, view }
}

// ---------------------------------------------------------------------------
// Links the assistant may offer a teacher
// ---------------------------------------------------------------------------

/** Every CTA a teacher is offered lives under this path. */
export const TEACHER_HREF_PREFIX = '/teacher/'
/**
 * Longer than any link the teacher prompt offers. A model-written href past
 * this is refused rather than rendered: a real destination is never that long.
 */
export const TEACHER_HREF_MAX = 600

// Only used to resolve relative paths; never fetched and never rendered.
const RESOLVE_BASE = 'https://omni-cta.invalid'

/**
 * The href as it will be rendered, or null when a teacher must not be sent
 * there. Accepts only a same-origin path (isSafeRelativeHref) whose
 * NORMALISED path is under /teacher/ — `/teacher/../auth/signout` and its
 * percent-encoded spellings resolve outside and are refused — and returns
 * the normalised form, so what is rendered is exactly what was checked.
 */
export function teacherCtaHref(href: unknown): string | null {
  if (!isSafeRelativeHref(href) || href.length > TEACHER_HREF_MAX) return null
  let url: URL
  try {
    url = new URL(href, RESOLVE_BASE)
  } catch {
    return null
  }
  if (url.origin !== RESOLVE_BASE) return null
  if (!url.pathname.startsWith(TEACHER_HREF_PREFIX)) return null
  const normalised = `${url.pathname}${url.search}${url.hash}`
  // The normalised form must still be a plain same-origin path.
  return isSafeRelativeHref(normalised) ? normalised : null
}

/** Directive types a teacher view may render. Upload and diagnostic cards are student flows. */
const TEACHER_ACTION_TYPES: ReadonlySet<string> = new Set(['render_cta', 'render_paper'])

/**
 * The action a teacher view may show, or null. A CTA survives only with a
 * teacher href (the directive's `params.href` and the rendered `cta.href`
 * are both replaced with the normalised one); a CTA without an href — which
 * the generic parser would point at the signup page — is dropped, as is any
 * student-facing card.
 */
export function restrictTeacherAction(action: OmniAIAction | null | undefined): OmniAIAction | null {
  if (!action || !TEACHER_ACTION_TYPES.has(action.type)) return null
  if (action.type !== 'render_cta') return action
  const href = teacherCtaHref(action.params?.href)
  if (!href) return null
  const text = (action.cta?.text ?? action.params?.text ?? '').trim()
  if (!text) return null
  return {
    type: 'render_cta',
    params: { ...(action.params ?? {}), href },
    cta: { text, href, style: action.cta?.style === 'secondary' ? 'secondary' : 'primary' },
  }
}
