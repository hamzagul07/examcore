import { SUBJECTS } from '@/lib/profile-options'
import type { AccentToken, SubjectFamily } from '@/lib/courses/margin-notes/types'

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

const ACCENT_BY_CODE: Record<string, AccentToken> = {
  '9709': 'acc-blue',
  '9231': 'acc-blue',
  '4024': 'acc-blue',
  '4037': 'acc-blue',
  '9702': 'acc-violet',
  '5054': 'acc-violet',
  '9701': 'acc-teal',
  '5070': 'acc-teal',
  '9700': 'ink',
  '5090': 'ink',
  '9708': 'acc-rose',
  '2281': 'acc-rose',
  '9609': 'acc-teal',
  '9706': 'amber',
  '7115': 'acc-teal',
  '7707': 'amber',
  '9618': 'acc-slate',
  '2210': 'acc-slate',
  '9990': 'acc-violet',
  '9699': 'acc-slate',
  '9489': 'red',
  '9084': 'acc-slate',
  '9607': 'acc-rose',
  '9488': 'acc-teal',
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
  return ACCENT_BY_CODE[code] ?? 'ink'
}

export function subjectFamily(code: string): SubjectFamily {
  const subject = SUBJECTS.find((s) => s.code === code)
  if (!subject) return 'Sciences'
  return GROUP_TO_FAM[subject.group] ?? 'Humanities'
}

export function accentCssVar(acc: AccentToken): string {
  return `var(--${acc})`
}
