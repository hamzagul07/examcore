import { getAqaSubjects } from '@/lib/aqa/catalog'

export function isAqaMarkingLive(): boolean {
  return process.env.NEXT_PUBLIC_AQA_MARKING_ENABLED !== '0'
}

export function getAqaMarkableContentCodes(): string[] {
  if (!isAqaMarkingLive()) return []
  return getAqaSubjects()
    .filter((s) => s.markingWave === 1)
    .map((s) => s.contentCode)
}

export function aqaMarkHref(contentCode?: string | null): string {
  const code = contentCode?.trim().toLowerCase() ?? ''
  if (code && getAqaMarkableContentCodes().includes(code)) {
    return `/mark?board=aqa&subject=${encodeURIComponent(code)}`
  }
  return '/mark?board=aqa'
}

export function resolveAqaMarkingSubjectName(code: string): string {
  const subject = getAqaSubjects().find((s) => s.contentCode === code.trim().toLowerCase())
  if (!subject) return 'A-level'
  return `AQA A-level ${subject.name}`
}
