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

/**
 * IB subjects, keyed by catalog slug base (no `ib-` prefix, no -hl/-sl).
 *
 * Every IB subject previously fell through to the grey fallback, so all 52 of
 * them rendered in the same ink green — the accent system existed but only
 * Cambridge was in it. Colour here is orientation, not decoration: a student
 * moving between Physics and History should be able to feel which one they are
 * in before reading a word.
 *
 * Spread within each group as well as between them, so a Biology lesson and a
 * Chemistry lesson do not look like the same page.
 */
const IB_ACCENTS: Record<string, { token: AccentToken; hex: string }> = {
  // Group 1 — Studies in language and literature
  'english-a-literature': { token: 'acc-rose', hex: '#ac5276' },
  'english-a-lang-lit': { token: 'acc-rose', hex: '#ac5276' },
  // Group 2 — Language acquisition
  'french-b': { token: 'amber', hex: '#9a7a40' },
  'spanish-b': { token: 'amber', hex: '#9a7a40' },
  // Group 3 — Individuals and societies
  history: { token: 'acc-slate', hex: '#5c6470' },
  geography: { token: 'acc-teal', hex: '#1a7575' },
  economics: { token: 'acc-rose', hex: '#ac5276' },
  'business-management': { token: 'acc-teal', hex: '#1f8a8a' },
  psychology: { token: 'acc-violet', hex: '#6b5b8a' },
  'global-politics': { token: 'acc-slate', hex: '#5c6470' },
  'digital-society': { token: 'acc-blue', hex: '#3a5fb8' },
  // Group 4 — Sciences
  biology: { token: 'ink', hex: '#1f8a8a' },
  chemistry: { token: 'acc-teal', hex: '#1a7575' },
  physics: { token: 'acc-violet', hex: '#6b5b8a' },
  'computer-science': { token: 'acc-blue', hex: '#3a5fb8' },
  'sports-exercise-health-science': { token: 'acc-rose', hex: '#ac5276' },
  'environmental-systems-and-societies': { token: 'ink', hex: '#1f8a8a' },
  'design-technology': { token: 'amber', hex: '#9a7a40' },
  // Group 5 — Mathematics
  'maths-aa': { token: 'acc-blue', hex: '#3a5fb8' },
  'maths-ai': { token: 'acc-blue', hex: '#3a5fb8' },
  // Group 6 — The arts
  'visual-arts': { token: 'acc-violet', hex: '#6b5b8a' },
  film: { token: 'acc-violet', hex: '#6b5b8a' },
  music: { token: 'acc-rose', hex: '#ac5276' },
  theatre: { token: 'acc-rose', hex: '#ac5276' },
  dance: { token: 'acc-rose', hex: '#ac5276' },
  // Core
  tok: { token: 'acc-slate', hex: '#5c6470' },
  'extended-essay': { token: 'acc-slate', hex: '#5c6470' },
  cas: { token: 'ink', hex: '#1f8a8a' },
}

/** Strips the `ib-` prefix and any -hl/-sl so both code shapes resolve. */
function ibKey(code: string): string {
  return code.replace(/^ib-/, '').replace(/-(hl|sl)$/i, '')
}

function lookup(code: string): { token: AccentToken; hex: string } | undefined {
  return SUBJECT_ACCENTS[code] ?? IB_ACCENTS[ibKey(code)]
}

const FALLBACK = { token: 'ink' as AccentToken, hex: '#8d8470' }

export function getSubjectAccent(code: string | null | undefined): AccentToken {
  if (!code) return FALLBACK.token
  return lookup(code)?.token ?? FALLBACK.token
}

export function getSubjectColor(code: string | null | undefined): string {
  if (!code) return FALLBACK.hex
  return lookup(code)?.hex ?? FALLBACK.hex
}

export function accentCssVar(acc: AccentToken): string {
  return `var(--${acc})`
}
