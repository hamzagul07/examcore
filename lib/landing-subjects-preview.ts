import { getSubjectColor } from '@/lib/design-system/subject-colors'

export type LandingSubjectPreview = {
  code: string
  name: string
  glyph: string
  color: string
  papers: number
  course: boolean
  lessons?: number
}

/** A-Level subjects shown on the landing preview grid (first 8). */
export const LANDING_SUBJECT_PREVIEW: LandingSubjectPreview[] = [
  { code: '9709', name: 'Mathematics', glyph: '∫', color: 'var(--ec-acc-blue)', papers: 124, course: true },
  { code: '9702', name: 'Physics', glyph: 'Ω', color: 'var(--ec-acc-violet)', papers: 112, course: true },
  { code: '9701', name: 'Chemistry', glyph: '⌬', color: 'var(--ec-acc-teal)', papers: 108, course: true },
  { code: '9700', name: 'Biology', glyph: 'ϕ', color: 'var(--ec-brand)', papers: 104, course: true },
  { code: '9708', name: 'Economics', glyph: '£', color: 'var(--ec-c-math)', papers: 96, course: false },
  { code: '9609', name: 'Business', glyph: '¶', color: 'var(--ec-acc-rose)', papers: 88, course: false },
  { code: '9618', name: 'Computer Science', glyph: '{}', color: 'var(--ec-acc-slate)', papers: 76, course: false },
  { code: '9489', name: 'History', glyph: '§', color: 'var(--ec-acc-violet)', papers: 68, course: false },
]

export function landingSubjectAccent(code: string): string {
  return getSubjectColor(code)
}

/*
 * `landingCourseMiniCards()` used to live here. It was never called, but its
 * `getCourseCatalog` import was load-bearing in the worst way: this module is
 * pulled in by the landing page, and `@/lib/courses` re-exports
 * attach-lesson-visuals → interactive-embeds → lesson-diagrams, which statically
 * imports 51 "use client" diagram components. Those dragged diagram-specs.ts
 * (192 KB) and subject-visuals.ts into the landing page's client bundle —
 * ~198 KB of JavaScript that shipped, parsed, and ran on every visit to a page
 * that renders no diagrams at all.
 *
 * If mini cards come back, read the catalog in the server component that renders
 * them, not from a module the landing page imports for a hardcoded array.
 */
