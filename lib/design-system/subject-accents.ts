import type { AccentToken } from '@/lib/courses/margin-notes/types'

/** Single source of truth: subject code → accent token + hex color. */
const SUBJECT_ACCENTS: Record<string, { token: AccentToken; hex: string }> = {
  '9709': { token: 'acc-blue', hex: '#3a5fb8' },
  '9231': { token: 'acc-blue', hex: '#3a5fb8' },
  '4024': { token: 'acc-blue', hex: '#3a5fb8' },
  '4037': { token: 'acc-blue', hex: '#3a5fb8' },
  '9702': { token: 'acc-violet', hex: '#6b5b8a' },
  '5054': { token: 'acc-violet', hex: '#6b5b8a' },
  '9701': { token: 'acc-teal', hex: '#1a7575' },
  '5070': { token: 'acc-teal', hex: '#1a7575' },
  '9700': { token: 'ink', hex: '#1f8a8a' },
  '5090': { token: 'ink', hex: '#1f8a8a' },
  '9708': { token: 'acc-rose', hex: '#ac5276' },
  '2281': { token: 'acc-rose', hex: '#ac5276' },
  '9609': { token: 'acc-teal', hex: '#1f8a8a' },
  '9706': { token: 'amber', hex: '#9a7a40' },
  '7115': { token: 'acc-teal', hex: '#1f8a8a' },
  '7707': { token: 'amber', hex: '#9a7a40' },
  '9618': { token: 'acc-slate', hex: '#3a5fb8' },
  '2210': { token: 'acc-slate', hex: '#3a5fb8' },
  '9990': { token: 'acc-violet', hex: '#ac5276' },
  '9699': { token: 'acc-slate', hex: '#ac5276' },
  '9489': { token: 'red', hex: '#ac5276' },
  '9084': { token: 'acc-slate', hex: '#ac5276' },
  '9607': { token: 'acc-rose', hex: '#ac5276' },
  '9488': { token: 'acc-teal', hex: '#ac5276' },
}

const FALLBACK = { token: 'ink' as AccentToken, hex: '#8d8470' }

export function getSubjectAccent(code: string | null | undefined): AccentToken {
  if (!code) return FALLBACK.token
  return SUBJECT_ACCENTS[code]?.token ?? FALLBACK.token
}

export function getSubjectColor(code: string | null | undefined): string {
  if (!code) return FALLBACK.hex
  return SUBJECT_ACCENTS[code]?.hex ?? FALLBACK.hex
}

export function accentCssVar(acc: AccentToken): string {
  return `var(--${acc})`
}
