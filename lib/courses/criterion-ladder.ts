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

/**
 * A band's MARK RANGE ONLY — deliberately no descriptor text.
 *
 * The band descriptors are verbatim licensed IB prose. `app/api/ib/catalog/route.ts`
 * already states the policy for this codebase: public surfaces return "only
 * non-sensitive metadata (codes, labels, level, model, max_marks) — NOT the
 * verbatim licensed descriptors/prose". Lesson pages are public, prerendered and
 * in the sitemap, so they fall under that rule.
 *
 * The descriptors stay in the database and remain available to the marking
 * pipeline, which is where they were licensed to be used.
 */
export type CriterionBand = {
  marksMin: number
  marksMax: number
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

/**
 * What the weightings mean for someone planning the work.
 *
 * The ladder shows the criteria and their shares, and then leaves the reader to
 * draw the conclusion. The conclusion is the useful part: with a fixed number
 * of hours, marks move fastest in the heaviest criterion, and students
 * routinely spend equal effort on a criterion worth 8 marks and one worth 24.
 *
 * Pure, and deliberately unwilling to invent an insight where there is not one
 * — a component whose criteria are evenly weighted has no "focus here", and
 * saying otherwise would be worse than saying nothing.
 */

export type CriterionWeight = { letter: string; name: string; maxMarks: number }

export type LadderFocus =
  | { kind: 'none' }
  /** One criterion is clearly the heaviest. */
  | { kind: 'single'; letter: string; name: string; share: number }
  /** Several tie for heaviest — name them all rather than picking arbitrarily. */
  | { kind: 'tied'; letters: string[]; share: number }

/**
 * Only called out when it is meaningfully heavier than an even split, so a
 * three-way 34/33/33 stays silent. A fifth again as much as an even share is
 * the point where the difference is worth planning around.
 */
export const FOCUS_RATIO = 1.2

export function ladderFocus(criteria: readonly CriterionWeight[]): LadderFocus {
  const usable = criteria.filter((c) => c.maxMarks > 0)
  if (usable.length < 2) return { kind: 'none' }

  const total = usable.reduce((n, c) => n + c.maxMarks, 0)
  if (total <= 0) return { kind: 'none' }

  const top = Math.max(...usable.map((c) => c.maxMarks))
  const evenShare = total / usable.length
  if (top < evenShare * FOCUS_RATIO) return { kind: 'none' }

  const heaviest = usable.filter((c) => c.maxMarks === top)
  const share = Math.round((top / total) * 100)
  if (heaviest.length === 1) {
    return { kind: 'single', letter: heaviest[0]!.letter, name: heaviest[0]!.name, share }
  }
  return { kind: 'tied', letters: heaviest.map((c) => c.letter), share }
}

/** The sentence to show, or null when there is nothing worth saying. */
export function focusMessage(focus: LadderFocus): string | null {
  switch (focus.kind) {
    case 'single':
      return `${focus.letter} — ${focus.name} — carries ${focus.share}% of the marks on its own. If your time is short, that is where it moves fastest.`
    case 'tied':
      return `${focus.letters.join(' and ')} are the heaviest, at ${focus.share}% each. Plan the work around those before the rest.`
    default:
      return null
  }
}
