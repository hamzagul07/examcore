import { SUBJECTS } from '@/lib/profile-options'

/** Stable subject palette — readable on zen + late-night canvases. */
const SUBJECT_PALETTE: Record<string, string> = {
  '9709': '#60a5fa',
  '9231': '#818cf8',
  '9700': '#34d399',
  '9701': '#2dd4bf',
  '9702': '#38bdf8',
  '9708': '#fbbf24',
  '9609': '#fb923c',
  '9706': '#a78bfa',
  '9489': '#f472b6',
  '9699': '#e879f9',
  '9990': '#c084fc',
  '9084': '#94a3b8',
  '9488': '#86efac',
  '9618': '#22d3ee',
  '9607': '#f87171',
}

const FALLBACK = '#94a3b8'

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
