import { getApCourses } from '@/lib/ap/catalog'

export function isApMarkingLive(): boolean {
  return process.env.NEXT_PUBLIC_AP_MARKING_ENABLED !== '0'
}

export function getApMarkableContentCodes(): string[] {
  if (!isApMarkingLive()) return []
  return getApCourses()
    .filter((c) => c.markingEnabled)
    .map((c) => c.contentCode)
}

export function apMarkHref(contentCode?: string | null): string {
  const code = contentCode?.trim().toLowerCase() ?? ''
  if (code && getApMarkableContentCodes().includes(code)) {
    return `/mark?board=ap&subject=${encodeURIComponent(code)}`
  }
  return '/mark?board=ap'
}

export function resolveApMarkingSubjectName(code: string): string {
  const course = getApCourses().find((c) => c.contentCode === code.trim().toLowerCase())
  if (!course) return 'AP'
  return `AP ${course.name}`
}
