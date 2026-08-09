/**
 * OxfordAQA IAL marking — Wave 1 Maths/Physics/Chemistry + Wave 1.5 Biology.
 * Kill-switch: NEXT_PUBLIC_OXFORDAQA_MARKING_ENABLED=0
 */

import {
  getOxfordaqaSubjects,
  type OxfordaqaSubject,
} from '@/lib/oxfordaqa/catalog'

export function isOxfordaqaMarkingLive(): boolean {
  return process.env.NEXT_PUBLIC_OXFORDAQA_MARKING_ENABLED !== '0'
}

export function getOxfordaqaMarkableSubjects(): OxfordaqaSubject[] {
  if (!isOxfordaqaMarkingLive()) return []
  return getOxfordaqaSubjects('international-a-level').filter(
    (s) => s.shellEnabled && (s.markingWave === 1 || s.markingWave === 1.5)
  )
}

export function getOxfordaqaMarkableContentCodes(): string[] {
  return getOxfordaqaMarkableSubjects().map((s) => s.contentCode)
}

export function isOxfordaqaMarkableCode(code: string): boolean {
  return getOxfordaqaMarkableContentCodes().includes(code.trim().toLowerCase())
}

export function oxfordaqaMarkHref(contentCode?: string | null): string {
  const code = contentCode?.trim().toLowerCase() ?? ''
  if (code && isOxfordaqaMarkableCode(code)) {
    return `/mark?board=oxfordaqa&subject=${encodeURIComponent(code)}`
  }
  return '/mark?board=oxfordaqa'
}

export function resolveOxfordaqaMarkingSubjectName(code: string): string {
  const subject = getOxfordaqaSubjects().find(
    (s) => s.contentCode === code.trim().toLowerCase()
  )
  if (!subject) return 'International A-level'
  return `OxfordAQA International A-level ${subject.name}`
}
