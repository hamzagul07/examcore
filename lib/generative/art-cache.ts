import { journalCacheKey } from '@/lib/dashboard/journal-data'

export function readArtCache(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeArtCache(key: string, dataUrl: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(key, dataUrl)
  } catch {
    // Quota exceeded — skip cache
  }
}

export function buildArtCacheKey(
  userId: string,
  subjectCode: string,
  attemptCount: number,
  latestAttemptId: string
): string {
  return journalCacheKey(userId, subjectCode, attemptCount, latestAttemptId)
}
