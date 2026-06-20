/**
 * IB Diploma Programme (IBDP) subject catalogue — hand-curated single source of
 * truth for the /ib SEO surface. No Supabase/PDF dependency (unlike the Cambridge
 * subject-papers cache): IB has no public 4-digit codes, so subjects are keyed by
 * a readable {subject}-{hl|sl} slug. Powers /ib, /ib/subjects/*, /ib/past-papers/*.
 *
 * Scope: IBDP only (MYP is criterion-based — separate, later). Marking is Phase 2.
 */

export type IbLevel = 'HL' | 'SL'

export type IbSubject = {
  slug: string
  name: string
  level: IbLevel
  group: string
  groupNumber: number
  papers: string[]
  accent: string
  glyph: string
  /** One-line, exam-accurate blurb for SEO copy + page intro. */
  blurb: string
}

/** Recent exam series we present in the past-paper archive (post-COVID, accurate). */
export const IB_SESSIONS = [
  'May 2024',
  'November 2023',
  'May 2023',
  'November 2022',
  'May 2022',
  'November 2021',
  'May 2021',
] as const

export const IB_GROUPS = [
  'Studies in Language and Literature',
  'Language Acquisition',
  'Individuals and Societies',
  'Sciences',
  'Mathematics',
] as const

type BaseSubject = {
  slugBase: string
  name: string
  group: string
  groupNumber: number
  levels: IbLevel[]
  /** Papers by level. */
  papers: Partial<Record<IbLevel, string[]>>
  accent: string
  glyph: string
  blurb: string
}

const P123 = ['Paper 1', 'Paper 2', 'Paper 3']
const P12 = ['Paper 1', 'Paper 2']

// Group accents (visual coherence across the surface).
const ACC = {
  langlit: '#7c5cbf',
  lang: '#2d8a6e',
  society: '#c17f3a',
  science: '#3b6fd9',
  maths: '#b84a62',
}

const BASE: BaseSubject[] = [
  // Group 1 — Studies in Language and Literature
  {
    slugBase: 'english-a-lang-lit', name: 'English A: Language and Literature', group: IB_GROUPS[0], groupNumber: 1,
    levels: ['HL', 'SL'], papers: { HL: P12, SL: P12 }, accent: ACC.langlit, glyph: 'A',
    blurb: 'Analyse non-literary texts (Paper 1) and literary works (Paper 2) through guided textual and comparative essays.',
  },
  {
    slugBase: 'english-a-literature', name: 'English A: Literature', group: IB_GROUPS[0], groupNumber: 1,
    levels: ['HL', 'SL'], papers: { HL: P12, SL: P12 }, accent: ACC.langlit, glyph: 'L',
    blurb: 'Guided literary analysis (Paper 1) and a comparative essay on studied works (Paper 2).',
  },
  // Group 2 — Language Acquisition
  {
    slugBase: 'spanish-b', name: 'Spanish B', group: IB_GROUPS[1], groupNumber: 2,
    levels: ['HL', 'SL'], papers: { HL: P12, SL: P12 }, accent: ACC.lang, glyph: 'E',
    blurb: 'Productive writing (Paper 1) and receptive reading/listening (Paper 2) across the five prescribed themes.',
  },
  {
    slugBase: 'french-b', name: 'French B', group: IB_GROUPS[1], groupNumber: 2,
    levels: ['HL', 'SL'], papers: { HL: P12, SL: P12 }, accent: ACC.lang, glyph: 'F',
    blurb: 'Productive writing (Paper 1) and receptive reading/listening (Paper 2) across the five prescribed themes.',
  },
  // Group 3 — Individuals and Societies
  {
    slugBase: 'economics', name: 'Economics', group: IB_GROUPS[2], groupNumber: 3,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.society, glyph: '€',
    blurb: 'Extended response (Paper 1), data response (Paper 2) and — at HL — a quantitative/policy paper (Paper 3).',
  },
  {
    slugBase: 'business-management', name: 'Business Management', group: IB_GROUPS[2], groupNumber: 3,
    levels: ['HL', 'SL'], papers: { HL: P12, SL: P12 }, accent: ACC.society, glyph: 'B',
    blurb: 'Case-study and structured analysis built on the business management toolkit, with evaluation under pressure.',
  },
  {
    slugBase: 'history', name: 'History', group: IB_GROUPS[2], groupNumber: 3,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.society, glyph: 'H',
    blurb: 'Source analysis (Paper 1), thematic essays (Paper 2) and — at HL — a regional depth-study paper (Paper 3).',
  },
  {
    slugBase: 'geography', name: 'Geography', group: IB_GROUPS[2], groupNumber: 3,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.society, glyph: 'G',
    blurb: 'Geographic themes (Paper 1), the core units (Paper 2) and — at HL — global interactions (Paper 3).',
  },
  {
    slugBase: 'psychology', name: 'Psychology', group: IB_GROUPS[2], groupNumber: 3,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.society, glyph: 'Ψ',
    blurb: 'The three approaches (Paper 1), research methods/options (Paper 2) and — at HL — qualitative research (Paper 3).',
  },
  // Group 4 — Sciences
  {
    slugBase: 'biology', name: 'Biology', group: IB_GROUPS[3], groupNumber: 4,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P123 }, accent: ACC.science, glyph: '🧬',
    blurb: 'Multiple choice (Paper 1), data and extended response (Paper 2) and the option/short-answer paper (Paper 3).',
  },
  {
    slugBase: 'chemistry', name: 'Chemistry', group: IB_GROUPS[3], groupNumber: 4,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P123 }, accent: ACC.science, glyph: '⚗',
    blurb: 'Multiple choice (Paper 1), structured/extended response (Paper 2) and the data/option paper (Paper 3).',
  },
  {
    slugBase: 'physics', name: 'Physics', group: IB_GROUPS[3], groupNumber: 4,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P123 }, accent: ACC.science, glyph: '⚛',
    blurb: 'Multiple choice (Paper 1), structured/extended response (Paper 2) and the data/option paper (Paper 3).',
  },
  {
    slugBase: 'computer-science', name: 'Computer Science', group: IB_GROUPS[3], groupNumber: 4,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.science, glyph: '⌨',
    blurb: 'Core theory (Paper 1), the case study (Paper 2) and — at HL — chosen-option questions (Paper 3).',
  },
  {
    slugBase: 'environmental-systems-and-societies', name: 'Environmental Systems and Societies', group: IB_GROUPS[3], groupNumber: 4,
    levels: ['SL'], papers: { SL: P12 }, accent: ACC.science, glyph: '🌱',
    blurb: 'A transdisciplinary Group 3/4 course: case-study resource booklet (Paper 1) and structured essays (Paper 2).',
  },
  // Group 5 — Mathematics
  {
    slugBase: 'maths-aa', name: 'Mathematics: Analysis and Approaches', group: IB_GROUPS[4], groupNumber: 5,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.maths, glyph: '∑',
    blurb: 'No calculator (Paper 1), calculator allowed (Paper 2) and — at HL — an extended problem-solving paper (Paper 3).',
  },
  {
    slugBase: 'maths-ai', name: 'Mathematics: Applications and Interpretation', group: IB_GROUPS[4], groupNumber: 5,
    levels: ['HL', 'SL'], papers: { HL: P123, SL: P12 }, accent: ACC.maths, glyph: 'π',
    blurb: 'Calculator-based modelling throughout: short questions (Paper 1), long questions (Paper 2) and HL Paper 3.',
  },
]

function buildSubjects(): IbSubject[] {
  const out: IbSubject[] = []
  for (const b of BASE) {
    for (const level of b.levels) {
      out.push({
        slug: `${b.slugBase}-${level.toLowerCase()}`,
        name: b.name,
        level,
        group: b.group,
        groupNumber: b.groupNumber,
        papers: b.papers[level] ?? P12,
        accent: b.accent,
        glyph: b.glyph,
        blurb: b.blurb,
      })
    }
  }
  return out
}

const IB_SUBJECTS = buildSubjects()

export function getIbSubjects(): IbSubject[] {
  return IB_SUBJECTS
}

export function getIbSubject(slug: string): IbSubject | null {
  return IB_SUBJECTS.find((s) => s.slug === slug) ?? null
}

export function getIbSubjectSlugs(): string[] {
  return IB_SUBJECTS.map((s) => s.slug)
}

/** Subjects grouped by IB group, in syllabus order. */
export function getIbSubjectsByGroup(): { group: string; groupNumber: number; subjects: IbSubject[] }[] {
  return IB_GROUPS.map((group, i) => ({
    group,
    groupNumber: i + 1,
    subjects: IB_SUBJECTS.filter((s) => s.group === group),
  })).filter((g) => g.subjects.length > 0)
}

export function ibSessionYears(): number[] {
  const years = new Set<number>()
  for (const s of IB_SESSIONS) {
    const m = s.match(/(\d{4})/)
    if (m) years.add(Number(m[1]))
  }
  return [...years].sort((a, b) => b - a)
}

export function ibYearRange(): string {
  const ys = ibSessionYears()
  if (!ys.length) return ''
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  return min === max ? `${min}` : `${min}–${max}`
}
