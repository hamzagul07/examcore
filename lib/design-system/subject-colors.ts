import { SUBJECTS } from '@/lib/profile-options'

/** Subject palette — Margin Notes accent colors. */
const SUBJECT_PALETTE: Record<string, string> = {
  '9709': '#9a7a40',
  '9231': '#9a7a40',
  '4024': '#9a7a40',
  '4037': '#9a7a40',
  '9700': '#1f8a8a',
  '5090': '#1f8a8a',
  '9701': '#6b5b8a',
  '5070': '#6b5b8a',
  '9702': '#3a5fb8',
  '5054': '#3a5fb8',
  '9708': '#1f8a8a',
  '9609': '#1f8a8a',
  '9706': '#1f8a8a',
  '7115': '#1f8a8a',
  '2281': '#1f8a8a',
  '7707': '#1f8a8a',
  '9489': '#ac5276',
  '9699': '#ac5276',
  '9990': '#ac5276',
  '9084': '#ac5276',
  '9618': '#3a5fb8',
  '2210': '#3a5fb8',
  '9607': '#ac5276',
  '9488': '#ac5276',
}

const FALLBACK = '#8d8470'

export function getSubjectColor(code: string | null | undefined): string {
  if (!code) return FALLBACK
  return SUBJECT_PALETTE[code] ?? FALLBACK
}

/** All enabled subject codes with assigned colors (for legend chips). */
export function subjectColorEntries(): { code: string; color: string; label: string }[] {
  return SUBJECTS.filter((s) => s.enabled).map((s) => ({
    code: s.code,
    color: getSubjectColor(s.code),
    label: s.label,
  }))
}
