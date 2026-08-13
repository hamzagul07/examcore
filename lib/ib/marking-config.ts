/**
 * IB Diploma marking profiles — criterion bands, paper styles, and practice rubrics.
 * Powers /mark practice mode for IB slugs (`ib-biology-hl`, `ib-tok`, …).
 */

import type { MarkingStyle } from '@/lib/marking/types'
import { isIbSubjectCode as isIbCourseSubject } from '@/lib/courses/board'

export type IbCriterionBand = {
  level: number
  descriptor: string
}

export type IbCriterion = {
  id: string
  name: string
  maxMarks: number
  /**
   * Omitted when the authoritative bands live in the catalogue
   * (`ib_criterion_band`) rather than here.
   *
   * A criterion without bands still describes the shape of the assessment —
   * how many marks, under what heading — which is all the practice-question
   * generator needs. What it deliberately cannot do is act as a marking rubric,
   * because a paraphrased band descriptor marks a student against a standard
   * the IB never wrote.
   */
  bands?: IbCriterionBand[]
}

export type IbMarkingProfile = {
  /** Stored /mark practice code, e.g. ib-tok */
  code: string
  /** Catalog slug without ib- prefix, e.g. tok */
  slug: string
  name: string
  level: 'HL' | 'SL' | 'Core'
  group: string
  /** Default style when no official mark scheme row exists */
  practiceStyle: MarkingStyle
  practiceMaxMarks: number
  /** Multi-criterion rubric (TOK essay, EE, arts components) */
  criteria?: IbCriterion[]
  papers: Partial<Record<string, MarkingStyle>>
  markingBlurb: string
}

/**
 * Extended Essay criteria — shape only; the bands are catalogued.
 *
 * These carried a generic five-level band scale, where the IB uses
 * four bands per criterion with descriptors averaging ~470 characters. Marking
 * an EE against the generic version was strictly worse than the verbatim text
 * already stored in `ib_criterion_band`, which is what marking now reads.
 */
const EE_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Focus and method', maxMarks: 6 },
  { id: 'B', name: 'Knowledge and understanding', maxMarks: 6 },
  { id: 'C', name: 'Critical thinking', maxMarks: 12 },
  { id: 'D', name: 'Presentation', maxMarks: 4 },
  { id: 'E', name: 'Engagement', maxMarks: 6 },
]

/**
 * TOK essay — ONE holistic criterion out of 10.
 *
 * This used to declare two criteria of five marks each, which is not how the
 * TOK essay is assessed and not what the catalogue holds: the IB marks it as a
 * single global-impression judgement against six bands. Splitting it in two
 * invented an assessment structure and then marked students against it.
 */
const TOK_ESSAY_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Theory of knowledge essay', maxMarks: 10 },
]

/**
 * Group 6 and CAS: no rubric here, on purpose.
 *
 * These subjects used to declare criteria — "Artistic intention and theatrical
 * vision /8", "Composition and choreographic choices /10" — carrying the same
 * generic five-level band text as every other subject. None of it is sourced.
 * Unlike Visual Arts, which is catalogued and now marks against its real
 * descriptors, Film, Theatre, Music, Dance and CAS have no rows in
 * `ib_criterion_band` at all, so there was nothing to check those numbers
 * against and no way to correct them.
 *
 * An invented rubric is worse than an honest generic one precisely because it
 * looks authoritative: a student told they scored 5/8 on "Artistic intention"
 * reasonably believes an examiner would recognise that criterion. Without the
 * source text these fall back to the openly-labelled generic band scale, which
 * gives a defensible mark and does not put words in the IB's mouth.
 *
 * The fix is to ingest the real descriptors into the catalogue — the same
 * pipeline that already holds Visual Arts, TOK and the EE — not to re-add
 * plausible-looking constants here.
 */

function profile(
  slug: string,
  name: string,
  level: IbMarkingProfile['level'],
  group: string,
  practiceStyle: MarkingStyle,
  practiceMaxMarks: number,
  papers: Partial<Record<string, MarkingStyle>>,
  markingBlurb: string,
  criteria?: IbCriterion[]
): IbMarkingProfile {
  return {
    code: `ib-${slug}`,
    slug,
    name,
    level,
    group,
    practiceStyle,
    practiceMaxMarks,
    criteria,
    papers,
    markingBlurb,
  }
}

/** All IB subjects with live practice marking (existing sciences + new Group 6 / Core). */
export const IB_MARKING_PROFILES: IbMarkingProfile[] = [
  // ── Existing course subjects (sciences / maths / humanities) ─────────────
  profile('biology-hl', 'Biology', 'HL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Biology HL — data response and extended response against markbands.'),
  profile('biology-sl', 'Biology', 'SL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Biology SL — shorter responses with IB command terms.'),
  profile('chemistry-hl', 'Chemistry', 'HL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Chemistry HL marking.'),
  profile('chemistry-sl', 'Chemistry', 'SL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
  }, 'IB Chemistry SL marking.'),
  profile('physics-hl', 'Physics', 'HL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Physics HL — show working; IB awards method marks without Cambridge B/M codes.'),
  profile('physics-sl', 'Physics', 'SL', 'Sciences', 'mixed', 10, {
    'Paper 1': 'mcq',
    'Paper 2': 'mixed',
  }, 'IB Physics SL marking.'),
  profile('economics-hl', 'Economics', 'HL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Economics HL — essay markbands with evaluation.'),
  profile('economics-sl', 'Economics', 'SL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
  }, 'IB Economics SL essay marking.'),
  profile('business-management-hl', 'Business Management', 'HL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
  }, 'IB Business Management HL — case study and extended response.'),
  // SL twin. Paper 1 is a shared component at both levels; Paper 2 is SL-sized
  // (40 marks against 50); Paper 3 is HL-only.
  profile('business-management-sl', 'Business Management', 'SL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
  }, 'IB Business Management SL — case study and extended response.'),
  profile('psychology-hl', 'Psychology', 'HL', 'Individuals and Societies', 'level_of_response', 22, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
    'Paper 3': 'level_of_response',
  }, 'IB Psychology HL — ERQs marked with markbands per approach/option.'),
  // SL twin. Papers 1 and 2 are the same components as HL (Paper 2 is one ERQ
  // at SL against two at HL — 22 marks either way, which is why the practice
  // question size is unchanged); Paper 3 is HL-only.
  profile('psychology-sl', 'Psychology', 'SL', 'Individuals and Societies', 'level_of_response', 22, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
  }, 'IB Psychology SL — ERQs marked with markbands per approach.'),
  profile('history-hl', 'History', 'HL', 'Individuals and Societies', 'level_of_response', 22, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
    'Paper 3': 'level_of_response',
  }, 'IB History HL — source analysis and essay markbands.'),
  profile('history-sl', 'History', 'SL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
  }, 'IB History SL — source-based and thematic essay marking.'),
  profile('geography-hl', 'Geography', 'HL', 'Individuals and Societies', 'level_of_response', 20, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
    'Paper 3': 'level_of_response',
  }, 'IB Geography HL — geographic themes and HL extension essays.'),
  profile('geography-sl', 'Geography', 'SL', 'Individuals and Societies', 'level_of_response', 15, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
  }, 'IB Geography SL — structured and extended response markbands.'),
  profile('english-a-lang-lit-hl', 'English A: Language and Literature', 'HL', 'Studies in Language and Literature', 'level_of_response', 20, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'level_of_response',
    'HL Essay': 'level_of_response',
    IO: 'level_of_response',
  }, 'IB English A Lang & Lit HL — textual analysis and comparative essay criteria.'),
  profile('english-a-lang-lit-sl', 'English A: Language and Literature', 'SL', 'Studies in Language and Literature', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'level_of_response',
    IO: 'level_of_response',
  }, 'IB English A Lang & Lit SL — guided analysis and comparative essay.'),
  profile('english-a-literature-hl', 'English A: Literature', 'HL', 'Studies in Language and Literature', 'level_of_response', 20, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'level_of_response',
    'HL Essay': 'level_of_response',
    IO: 'level_of_response',
  }, 'IB English A Literature HL — literary analysis and comparative essay.'),
  profile('english-a-literature-sl', 'English A: Literature', 'SL', 'Studies in Language and Literature', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'level_of_response',
    IO: 'level_of_response',
  }, 'IB English A Literature SL — guided analysis and comparative essay.'),
  profile('spanish-b-hl', 'Spanish B', 'HL', 'Language Acquisition', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
    IO: 'level_of_response',
  }, 'IB Spanish B HL — productive writing and receptive skills markbands.'),
  profile('spanish-b-sl', 'Spanish B', 'SL', 'Language Acquisition', 'level_of_response', 12, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
    IO: 'level_of_response',
  }, 'IB Spanish B SL — writing and comprehension criteria.'),
  profile('french-b-hl', 'French B', 'HL', 'Language Acquisition', 'level_of_response', 15, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
    IO: 'level_of_response',
  }, 'IB French B HL — productive writing and receptive skills markbands.'),
  profile('french-b-sl', 'French B', 'SL', 'Language Acquisition', 'level_of_response', 12, {
    'Paper 1': 'level_of_response',
    'Paper 2': 'mixed',
    IO: 'level_of_response',
  }, 'IB French B SL — writing and comprehension criteria.'),
  profile('computer-science-hl', 'Computer Science', 'HL', 'Sciences', 'mixed', 12, {
    'Paper 1': 'mixed',
    'Paper 2': 'mixed',
    'Paper 3': 'mixed',
  }, 'IB Computer Science HL — pseudocode and explanation questions.'),
  // SL twin. Papers 1 and 2 exist at both levels (SL is shorter — 70/45 marks
  // against 100/65); Paper 3, the HL case study, is HL-only.
  profile('computer-science-sl', 'Computer Science', 'SL', 'Sciences', 'mixed', 12, {
    'Paper 1': 'mixed',
    'Paper 2': 'mixed',
  }, 'IB Computer Science SL — pseudocode and explanation questions.'),
  profile('maths-aa-hl', 'Mathematics: Analysis and Approaches', 'HL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
    'Paper 3': 'point_based',
  }, 'IB Maths AA HL — method and accuracy marks.'),
  // SL twin. Papers 1 and 2 at 80 marks each against 110 at HL; Paper 3 is
  // HL-only. Per-question method/accuracy marking is identical at both levels,
  // so the practice question size does not change.
  profile('maths-aa-sl', 'Mathematics: Analysis and Approaches', 'SL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
  }, 'IB Maths AA SL — method and accuracy marks.'),
  profile('maths-ai-hl', 'Mathematics: Applications and Interpretation', 'HL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
    'Paper 3': 'point_based',
  }, 'IB Maths AI HL — modelling and interpretation marks.'),
  profile('maths-ai-sl', 'Mathematics: Applications and Interpretation', 'SL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
  }, 'IB Maths AI SL — modelling and interpretation marks.'),

  // ── Core ───────────────────────────────────────────────────────────────────
  profile(
    'tok',
    'Theory of Knowledge',
    'Core',
    'Core',
    'level_of_response',
    10,
    { Essay: 'level_of_response', Exhibition: 'level_of_response' },
    'TOK essay and exhibition commentary — criterion A/B markbands (understanding + analysis).',
    TOK_ESSAY_CRITERIA
  ),
  profile(
    'extended-essay',
    'Extended Essay',
    'Core',
    'Core',
    'level_of_response',
    34,
    { Essay: 'level_of_response' },
    'Extended Essay — five criteria (A–E) with level descriptors; holistic then per-criterion placement.',
    EE_CRITERIA
  ),
  profile(
    'cas',
    'Creativity, Activity, Service',
    'Core',
    'Core',
    'level_of_response',
    14,
    { Portfolio: 'level_of_response' },
    'CAS reflections and learning outcomes — formative criterion-style feedback against all seven LOs.'
  ),

  // ── Group 6 — The Arts ─────────────────────────────────────────────────────
  profile(
    'visual-arts-hl',
    'Visual Arts',
    'HL',
    'The Arts',
    'level_of_response',
    24,
    {
      'Comparative study': 'level_of_response',
      'Process portfolio': 'level_of_response',
      Exhibition: 'level_of_response',
    },
    'Visual Arts HL — comparative study, process portfolio, and exhibition criteria.'
  ),
  profile(
    'visual-arts-sl',
    'Visual Arts',
    'SL',
    'The Arts',
    'level_of_response',
    24,
    {
      'Comparative study': 'level_of_response',
      'Process portfolio': 'level_of_response',
      Exhibition: 'level_of_response',
    },
    'Visual Arts SL — same components with reduced breadth expectations.'
  ),
  profile(
    'theatre-hl',
    'Theatre',
    'HL',
    'The Arts',
    'level_of_response',
    20,
    {
      'Solo theatre piece': 'level_of_response',
      'Director\'s notebook': 'level_of_response',
      'Research presentation': 'level_of_response',
      'Collaborative project': 'level_of_response',
    },
    'Theatre HL — solo piece, director\'s notebook, research presentation, collaborative project.'
  ),
  profile(
    'theatre-sl',
    'Theatre',
    'SL',
    'The Arts',
    'level_of_response',
    18,
    {
      'Solo theatre piece': 'level_of_response',
      'Director\'s notebook': 'level_of_response',
      'Research presentation': 'level_of_response',
    },
    'Theatre SL — performance and research components with IB assessment criteria.'
  ),
  profile(
    'music-hl',
    'Music',
    'HL',
    'The Arts',
    'level_of_response',
    20,
    {
      'Exploring music in context': 'level_of_response',
      'Experimenting with music': 'level_of_response',
      'Presenting music': 'level_of_response',
    },
    'Music HL — inquiry, experimentation, and presentation criteria.'
  ),
  profile(
    'music-sl',
    'Music',
    'SL',
    'The Arts',
    'level_of_response',
    18,
    {
      'Exploring music in context': 'level_of_response',
      'Experimenting with music': 'level_of_response',
      'Presenting music': 'level_of_response',
    },
    'Music SL — musical analysis and creating criteria.'
  ),
  profile(
    'film-hl',
    'Film',
    'HL',
    'The Arts',
    'level_of_response',
    24,
    {
      'Textual analysis': 'level_of_response',
      'Comparative study': 'level_of_response',
      'Film portfolio': 'level_of_response',
      'Collaborative project': 'level_of_response',
    },
    'Film HL — analysis, comparison, portfolio, and collaborative filmmaking.'
  ),
  profile(
    'film-sl',
    'Film',
    'SL',
    'The Arts',
    'level_of_response',
    24,
    {
      'Textual analysis': 'level_of_response',
      'Comparative study': 'level_of_response',
      'Film portfolio': 'level_of_response',
    },
    'Film SL — textual analysis and portfolio criteria.'
  ),
  profile(
    'dance-hl',
    'Dance',
    'HL',
    'The Arts',
    'level_of_response',
    20,
    {
      'Composition and analysis': 'level_of_response',
      'Dance investigation': 'level_of_response',
      'Performance': 'level_of_response',
    },
    'Dance HL — composition, investigation, and performance criteria.'
  ),
  profile(
    'dance-sl',
    'Dance',
    'SL',
    'The Arts',
    'level_of_response',
    20,
    {
      'Composition and analysis': 'level_of_response',
      'Dance investigation': 'level_of_response',
      'Performance': 'level_of_response',
    },
    'Dance SL — choreography and analysis markbands.'
  ),
]

const BY_CODE = new Map(IB_MARKING_PROFILES.map((p) => [p.code, p]))

export function getIbMarkingProfile(code: string): IbMarkingProfile | null {
  return BY_CODE.get(code) ?? null
}

/**
 * Kept as a named export so the marking call sites are untouched, but the rule
 * now lives in lib/courses/board.ts.
 *
 * The old prefix test also missed the unprefixed catalog slug ("biology-hl")
 * that the canonical IB routes pass. Do NOT gate on a legacy marking profile
 * either: catalog subjects like `ib-maths-aa` are IB but have no profile, and
 * gating on BY_CODE mis-branded them as Cambridge.
 */
export function isIbSubjectCode(code: string): boolean {
  return isIbCourseSubject(code)
}

export function getIbMarkableSubjectCodes(): string[] {
  return IB_MARKING_PROFILES.map((p) => p.code)
}

export function getIbSubjectLabel(code: string): string | undefined {
  return BY_CODE.get(code)?.name
}

export function resolveSubjectLabel(code: string): string {
  return getIbSubjectLabel(code) ?? code
}

export function ibPracticeMarkingStyle(code: string): MarkingStyle {
  return getIbMarkingProfile(code)?.practiceStyle ?? 'level_of_response'
}

/** Subjects that use multi-criterion IB rubrics in practice mode. */
export function ibUsesCriterionRubrics(code: string): boolean {
  const p = getIbMarkingProfile(code)
  return Boolean(p?.criteria?.length)
}
