/** Per-subject accent colors — Phase 7 subject-specific rendering */
export type SubjectTheme = {
  accent: string
  accentSoft: string
  label: string
}

export const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  '9702': { accent: '#4a7c59', accentSoft: '#e8f2eb', label: 'Physics' },
  '9700': { accent: '#2d8a6e', accentSoft: '#e6f5ef', label: 'Biology' },
  '9701': { accent: '#3d6fa8', accentSoft: '#e8f0fa', label: 'Chemistry' },
  '9709': { accent: '#5b4fc7', accentSoft: '#eeecfa', label: 'Mathematics' },
  '9231': { accent: '#6b4fc7', accentSoft: '#f0ecfa', label: 'Further Maths' },
  '9708': { accent: '#b45309', accentSoft: '#fef3e2', label: 'Economics' },
  '9618': { accent: '#0d9488', accentSoft: '#e6faf8', label: 'Computer Science' },
  '9706': { accent: '#7c3aed', accentSoft: '#f3effe', label: 'Accounting' },
}

export function getSubjectTheme(code: string): SubjectTheme {
  return (
    SUBJECT_THEMES[code] ?? {
      accent: '#3b6fd9',
      accentSoft: '#e8f0fa',
      label: 'Course',
    }
  )
}
