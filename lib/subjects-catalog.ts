import { getSubjectColor } from '@/lib/design-system/subject-accents'
import { getCourseSubject } from '@/lib/courses'
import { getMarkingSubjectPages } from '@/lib/seo/programmatic-subjects'
import { getSubjectPaperStructure } from '@/lib/subject-papers'
import type { SubjectOption } from '@/lib/profile-options'
import type { LandingSubjectPreview } from '@/lib/landing-subjects-preview'

export const SUBJECT_GLYPHS: Record<string, string> = {
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

export type CatalogLevel = 'alevel' | 'olevel'

export type CatalogSubject = LandingSubjectPreview & {
  levels: string[]
  markingType: SubjectOption['markingType']
}

function subjectGlyph(code: string, label: string): string {
  return SUBJECT_GLYPHS[code] ?? label.charAt(0)
}

function estimatePaperCount(code: string): number {
  const structure = getSubjectPaperStructure(code)
  if (!structure?.sessions.length) return 0
  const components = new Set(structure.papers.flatMap((p) => p.components))
  return structure.sessions.length * components.size
}

function toCatalogSubject(subject: SubjectOption): CatalogSubject {
  const course = getCourseSubject(subject.code)
  const papers = estimatePaperCount(subject.code)
  return {
    code: subject.code,
    name: subject.label,
    glyph: subjectGlyph(subject.code, subject.label),
    color: getSubjectColor(subject.code),
    papers: papers > 0 ? papers : 48,
    course: !!course,
    lessons: course?.publishedCount ?? course?.lessonCount,
    levels: subject.levels,
    markingType: subject.markingType,
  }
}

export function getCatalogSubjects(level: CatalogLevel): CatalogSubject[] {
  return getMarkingSubjectPages()
    .filter((subject) => {
      const isOLevel = subject.levels.includes('O-Level')
      const isALevel =
        subject.levels.includes('A-Level') || subject.levels.includes('AS Level')
      if (level === 'olevel') return isOLevel
      return isALevel
    })
    .map(toCatalogSubject)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getAllCatalogSubjects(): CatalogSubject[] {
  return getMarkingSubjectPages().map(toCatalogSubject)
}

export function getCatalogSubject(code: string): CatalogSubject | null {
  const subject = getMarkingSubjectPages().find((s) => s.code === code)
  return subject ? toCatalogSubject(subject) : null
}

export function getCatalogStats(subjects: CatalogSubject[]) {
  const papers = subjects.reduce((sum, s) => sum + s.papers, 0)
  const marked = papers * 73
  return {
    syllabi: subjects.length,
    papers,
    marked,
    markedLabel:
      marked >= 1000 ? `${Math.round(marked / 1000)}k+` : String(marked),
    coursesWithContent: subjects.filter((s) => s.course).length,
  }
}

export function catalogLevelLabel(level: CatalogLevel): string {
  return level === 'olevel' ? 'O Level' : 'AS & A Level'
}

export function subjectLevelChip(subject: CatalogSubject): string {
  if (subject.levels.includes('O-Level') && !subject.levels.includes('A-Level')) {
    return 'O Level'
  }
  if (subject.levels.includes('AS Level') && subject.levels.includes('A-Level')) {
    return 'AS & A Level'
  }
  return subject.levels[0] ?? 'CAIE'
}
