/** Device-local course progress — shared by continue-learning + progress UI. */

export const COURSE_PROGRESS_KEY = 'markscheme-course-progress'
export const COURSE_LAST_LESSON_KEY = 'markscheme-last-lesson'

export const COURSE_PROGRESS_CHANGED = 'markscheme-course-progress-changed'
export const COURSE_LAST_LESSON_CHANGED = 'markscheme-last-lesson-changed'

export type ProgressMap = Record<string, Record<string, boolean>>

export type LastLesson = { code: string; slug: string }

export function readLocalProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(COURSE_PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function writeLocalProgress(map: ProgressMap) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent(COURSE_PROGRESS_CHANGED))
}

export function readLocalLastLesson(): LastLesson | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COURSE_LAST_LESSON_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastLesson
    if (typeof parsed.code === 'string' && typeof parsed.slug === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function writeLocalLastLesson(code: string, slug: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COURSE_LAST_LESSON_KEY, JSON.stringify({ code, slug }))
    window.dispatchEvent(new CustomEvent(COURSE_LAST_LESSON_CHANGED))
  } catch {
    /* ignore */
  }
}

/** Union merge — completed lessons from either source stay completed. */
export function mergeProgressMaps(a: ProgressMap, b: ProgressMap): ProgressMap {
  const out: ProgressMap = structuredClone(a)
  for (const [code, lessons] of Object.entries(b)) {
    if (!out[code]) out[code] = {}
    for (const [slug, done] of Object.entries(lessons)) {
      if (done) out[code][slug] = true
    }
  }
  return out
}

export function pickLastLesson(
  local: LastLesson | null,
  remote: LastLesson | null
): LastLesson | null {
  return local ?? remote
}
