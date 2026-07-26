/**
 * Maps a course lesson to the IB assessment component it prepares you for, so a
 * lesson can show the criteria it will actually be marked against.
 *
 * For the arts and the languages the criteria ARE the syllabus — a Visual Arts
 * process-portfolio lesson is not "about" a diagram-able object, it is about
 * what the four criteria reward. That makes the criterion ladder the right
 * picture for exactly the subjects no drawn family fits.
 *
 * Pure: the lesson -> component mapping is the part that silently goes wrong, so
 * it is testable without a database.
 */

export type ComponentRef = {
  /** ib_subject.code — note this is level-agnostic ("ib-visual-arts"). */
  subjectCode: string
  /** ib_component.component_key */
  componentKey: string
  /** 'HL' | 'SL'; components stored as 'both' match either. */
  level: 'HL' | 'SL'
}

/**
 * Course folder slug -> ib_subject.code.
 *
 * Only subjects whose criteria are actually loaded. Film, Music, Theatre and
 * Dance are deliberately absent: they have no rows in ib_criterion, so a ladder
 * for them would have nothing verbatim to show and we will not paraphrase IB
 * descriptors.
 */
const SUBJECT_CODE: Record<string, string> = {
  'ib-visual-arts': 'ib-visual-arts',
  'ib-french-b': 'ib-language-b',
  'ib-spanish-b': 'ib-language-b',
  'ib-english-a-lang-lit': 'ib-lang-a-langlit',
}

/** Normalises a lesson's free-text `paper` into a component_key. */
function componentKeyFor(subjectCode: string, paper: string): string | null {
  const p = paper.trim().toLowerCase()
  if (!p) return null

  if (subjectCode === 'ib-visual-arts') {
    if (p.includes('comparative')) return 'comparative_study'
    if (p.includes('process')) return 'process_portfolio'
    if (p.includes('exhibition')) return 'exhibition'
    return null
  }

  // Language B and Lang-Lit both use plain paper numbers, plus named orals.
  if (/^p\s*1$|paper\s*1/.test(p)) return 'paper_1'
  if (/^p\s*2$|paper\s*2/.test(p)) return 'paper_2'
  if (p.includes('individual oral') || p === 'io') return 'io'
  if (p.includes('hl essay')) return 'hl_essay'
  return null
}

/**
 * Visual Arts splits two of its components by level in the component_key itself
 * (comparative_study_hl / _sl) while others do not. Resolved here rather than at
 * the query, so the caller never has to know which are split.
 */
export function candidateComponentKeys(ref: ComponentRef): string[] {
  const suffix = ref.level.toLowerCase()
  return [`${ref.componentKey}_${suffix}`, ref.componentKey]
}

export function resolveComponent(
  courseSubjectSlug: string,
  paper: string | undefined | null
): ComponentRef | null {
  if (!paper) return null
  const level: 'HL' | 'SL' = /-hl$/.test(courseSubjectSlug) ? 'HL' : 'SL'
  const base = courseSubjectSlug.replace(/-(hl|sl)$/, '')
  const subjectCode = SUBJECT_CODE[base]
  if (!subjectCode) return null
  const componentKey = componentKeyFor(subjectCode, paper)
  if (!componentKey) return null
  return { subjectCode, componentKey, level }
}

export type CriterionBand = {
  marksMin: number
  marksMax: number
  descriptor: string
}

export type Criterion = {
  letter: string
  name: string
  maxMarks: number
  bands: CriterionBand[]
}

/** Bands ascending, so the ladder reads bottom-to-top like the mark scheme. */
export function sortBands(bands: CriterionBand[]): CriterionBand[] {
  return [...bands].sort((a, b) => a.marksMin - b.marksMin)
}
