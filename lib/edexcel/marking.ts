/**
 * Edexcel IAL marking surface (Phase E2 + sciences + Biology Wave 1.5).
 * Wave 1 = Mathematics + Physics + Chemistry; Wave 1.5 = Biology.
 */

import {
  getEdexcelSubjects,
  type EdexcelSubject,
  type EdexcelUnit,
} from '@/lib/edexcel/catalog'

/** Kill-switch: set NEXT_PUBLIC_EDEXCEL_MARKING_ENABLED=0 to hide from /mark. */
export function isEdexcelMarkingLive(): boolean {
  return process.env.NEXT_PUBLIC_EDEXCEL_MARKING_ENABLED !== '0'
}

export function getEdexcelMarkableMathsSubject(): EdexcelSubject | null {
  return (
    getEdexcelSubjects('international-a-level').find(
      (s) => s.slug === 'mathematics' && s.shellEnabled
    ) ?? null
  )
}

/** Markable subjects: IAL Wave 1/1.5 + UK A-level Wave 1 Maths/Physics. */
export function getEdexcelMarkableSubjects(): EdexcelSubject[] {
  return getEdexcelSubjects().filter(
    (s) =>
      s.shellEnabled &&
      (s.markingWave === 1 || s.markingWave === 1.5) &&
      (s.qualification === 'international-a-level' || s.qualification === 'a-level')
  )
}

/** Unit codes shown on /mark when board = edexcel. */
export function getEdexcelMarkableUnitCodes(): string[] {
  return getEdexcelMarkableSubjects().flatMap((s) => s.units.map((u) => u.code))
}

export function isEdexcelMathsUnitCode(code: string): boolean {
  return /^W(MA|ME|ST)\d{2}$/i.test(code.trim())
}

export function isEdexcelScienceUnitCode(code: string): boolean {
  return /^W(PH|CH|BI)\d{2}$/i.test(code.trim())
}

export function isEdexcelBiologyUnitCode(code: string): boolean {
  return /^WBI\d{2}$/i.test(code.trim())
}

export function getEdexcelUnitMeta(code: string): {
  subject: EdexcelSubject
  unit: EdexcelUnit
} | null {
  const upper = code.trim().toUpperCase()
  for (const subject of getEdexcelSubjects()) {
    const unit = subject.units.find((u) => u.code === upper)
    if (unit) return { subject, unit }
  }
  return null
}

export function resolveEdexcelUnitLabel(code: string): string {
  const meta = getEdexcelUnitMeta(code)
  if (!meta) return code
  return `${meta.unit.code} ${meta.unit.name}`
}

/** Display name for mark prompts (subject family, not unit). */
export function resolveEdexcelMarkingSubjectName(code: string): string {
  const meta = getEdexcelUnitMeta(code)
  if (!meta) return 'Mathematics'
  const qualLabel =
    meta.subject.qualification === 'a-level'
      ? 'A Level'
      : 'International A Level'
  return `${qualLabel} ${meta.subject.name} (${meta.unit.code})`
}

/**
 * Deep-link into /mark with board (+ unit when Wave 1 markable).
 * Keeps organic Edexcel landers from falling through to Cambridge defaults.
 */
export function edexcelMarkHref(unitCode?: string | null): string {
  const code = unitCode?.trim().toUpperCase() ?? ''
  if (code && getEdexcelMarkableUnitCodes().includes(code)) {
    return `/mark?board=edexcel&subject=${encodeURIComponent(code)}`
  }
  return '/mark?board=edexcel'
}
