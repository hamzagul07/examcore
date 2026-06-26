import {
  mergeProgressMaps,
  pickLastLesson,
  readLocalLastLesson,
  readLocalProgress,
  writeLocalLastLesson,
  writeLocalProgress,
  type LastLesson,
  type ProgressMap,
} from '@/lib/courses/course-progress-storage'

export type CloudCourseProgress = {
  progress: ProgressMap
  last_lesson: LastLesson | null
  updated_at: string | null
}

const SUBJECT_CODE_RE = /^[a-z0-9-]{2,64}$/i
const SLUG_RE = /^[a-z0-9-]{2,120}$/

export function sanitizeProgressMap(raw: unknown): ProgressMap {
  if (!raw || typeof raw !== 'object') return {}
  const out: ProgressMap = {}
  for (const [code, lessons] of Object.entries(raw as Record<string, unknown>)) {
    if (!SUBJECT_CODE_RE.test(code)) continue
    if (!lessons || typeof lessons !== 'object') continue
    const bucket: Record<string, boolean> = {}
    for (const [slug, done] of Object.entries(lessons as Record<string, unknown>)) {
      if (!SLUG_RE.test(slug)) continue
      if (done === true) bucket[slug] = true
    }
    if (Object.keys(bucket).length) out[code] = bucket
  }
  return out
}

export function sanitizeLastLesson(raw: unknown): LastLesson | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.code !== 'string' || typeof o.slug !== 'string') return null
  if (!SUBJECT_CODE_RE.test(o.code) || !SLUG_RE.test(o.slug)) return null
  return { code: o.code, slug: o.slug }
}

export async function fetchCloudCourseProgress(): Promise<CloudCourseProgress | null> {
  const res = await fetch('/api/courses/progress', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Could not load course progress')
  const data = (await res.json()) as CloudCourseProgress
  return {
    progress: sanitizeProgressMap(data.progress),
    last_lesson: sanitizeLastLesson(data.last_lesson),
    updated_at: data.updated_at ?? null,
  }
}

export async function pushCloudCourseProgress(payload: {
  progress: ProgressMap
  last_lesson: LastLesson | null
}): Promise<void> {
  const res = await fetch('/api/courses/progress', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 401) return
  if (!res.ok) throw new Error('Could not save course progress')
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
let syncPromise: Promise<void> | null = null

export function scheduleCloudProgressPush(delayMs = 800) {
  if (typeof window === 'undefined') return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushCloudCourseProgress({
      progress: readLocalProgress(),
      last_lesson: readLocalLastLesson(),
    }).catch(() => {
      /* offline or transient — local progress still works */
    })
  }, delayMs)
}

/** Pull remote state, merge with local, write local, push merged snapshot. */
export async function syncCourseProgressOnce(): Promise<void> {
  if (typeof window === 'undefined') return
  const remote = await fetchCloudCourseProgress()
  if (!remote) return

  const local = readLocalProgress()
  const merged = mergeProgressMaps(local, remote.progress)
  const last = pickLastLesson(readLocalLastLesson(), remote.last_lesson)

  writeLocalProgress(merged)
  if (last) writeLocalLastLesson(last.code, last.slug)

  await pushCloudCourseProgress({ progress: merged, last_lesson: last })
}

export function runCourseProgressSyncOnce(): Promise<void> {
  if (!syncPromise) {
    syncPromise = syncCourseProgressOnce().finally(() => {
      syncPromise = null
    })
  }
  return syncPromise
}
