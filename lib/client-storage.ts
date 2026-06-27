/** Client-only localStorage keys (migrates legacy examcore_* on read). */

export const STORAGE_KEYS = {
  lastSelection: 'markscheme_last_selection',
  pendingQuestion: 'markscheme_pending_question',
  pendingUpload: 'markscheme_pending_upload',
  pendingUploadMeta: 'markscheme_pending_upload_meta',
  blogSignupDismissed: 'markscheme_blog_signup_dismissed',
} as const

function legacyKey(key: string): string {
  return key.replace(/^markscheme_/, 'examcore_')
}

export function readClientStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  const current = window.localStorage.getItem(key)
  if (current !== null) return current
  const legacy = legacyKey(key)
  const old = window.localStorage.getItem(legacy)
  if (old !== null) {
    window.localStorage.setItem(key, old)
    return old
  }
  return null
}

export function writeClientStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

export function removeClientStorage(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
  window.localStorage.removeItem(legacyKey(key))
}

export function readSessionStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  const current = window.sessionStorage.getItem(key)
  if (current !== null) return current
  const old = window.sessionStorage.getItem(legacyKey(key))
  if (old !== null) {
    window.sessionStorage.setItem(key, old)
    return old
  }
  return null
}

export function writeSessionStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key, value)
}

export function removeSessionStorage(key: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(key)
  window.sessionStorage.removeItem(legacyKey(key))
}
