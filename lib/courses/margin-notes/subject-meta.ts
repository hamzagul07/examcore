import { SUBJECTS } from '@/lib/profile-options'
import type { AccentToken, SubjectFamily } from '@/lib/courses/margin-notes/types'
import { accentCssVar as accentVar, getSubjectAccent } from '@/lib/design-system/subject-accents'

const SUBJECT_GLYPHS: Record<string, string> = {
  '9709': '∫',
  '9231': 'Σ',
  '9702': 'Ω',
  '9701': '⌬',
  '9700': 'ϕ',
  '9708': '£',
  '9609': '¶',
  '9706': '¤',
  '9489': '§',
  '9699': '∴',
  '9990': 'Ψ',
  '9084': '“',
  '9488': '¶',
  '9618': '{}',
  '9607': '▶',
  '4024': '∑',
  '4037': 'ƒ',
  '5090': 'ϕ',
  '5070': '⚗',
  '5054': 'λ',
  '2281': '£',
  '7115': '¶',
  '7707': '¤',
}

const GROUP_TO_FAM: Record<string, SubjectFamily> = {
  Mathematics: 'Maths',
  Sciences: 'Sciences',
  Humanities: 'Humanities',
  'Business & Economics': 'Commerce',
}

export function subjectGlyph(code: string, name: string): string {
  return SUBJECT_GLYPHS[code] ?? name.charAt(0)
}

export function subjectAccent(code: string): AccentToken {
  return getSubjectAccent(code)
}

export function subjectFamily(code: string): SubjectFamily {
  const subject = SUBJECTS.find((s) => s.code === code)
  if (!subject) return 'Sciences'
  return GROUP_TO_FAM[subject.group] ?? 'Humanities'
}

export function accentCssVar(acc: AccentToken): string {
  return accentVar(acc)
}
