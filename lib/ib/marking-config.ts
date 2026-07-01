/**
 * IB Diploma marking profiles — criterion bands, paper styles, and practice rubrics.
 * Powers /mark practice mode for IB slugs (`ib-biology-hl`, `ib-tok`, …).
 */

import type { MarkingStyle } from '@/lib/marking/types'

export type IbCriterionBand = {
  level: number
  descriptor: string
}

export type IbCriterion = {
  id: string
  name: string
  maxMarks: number
  bands: IbCriterionBand[]
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

const LOR_BANDS_5: IbCriterionBand[] = [
  { level: 0, descriptor: 'Work does not reach the standard described by levels 1–5.' },
  { level: 1, descriptor: 'Limited engagement with the task; descriptive with little analysis.' },
  { level: 2, descriptor: 'Some relevant points; analysis is superficial or uneven.' },
  { level: 3, descriptor: 'Adequate response; analysis is clear but not sustained.' },
  { level: 4, descriptor: 'Good response; analysis is mostly convincing with some evaluation.' },
  { level: 5, descriptor: 'Excellent response; sustained, convincing analysis and evaluation.' },
]

const EE_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Focus and method', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Knowledge and understanding', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'C', name: 'Critical thinking', maxMarks: 12, bands: LOR_BANDS_5 },
  { id: 'D', name: 'Presentation', maxMarks: 4, bands: LOR_BANDS_5 },
  { id: 'E', name: 'Engagement', maxMarks: 6, bands: LOR_BANDS_5 },
]

const TOK_ESSAY_CRITERIA: IbCriterion[] = [
  {
    id: 'A',
    name: 'Understanding knowledge questions',
    maxMarks: 5,
    bands: LOR_BANDS_5,
  },
  {
    id: 'B',
    name: 'Quality of analysis of knowledge questions',
    maxMarks: 5,
    bands: LOR_BANDS_5,
  },
]

const VA_COMPARATIVE: IbCriterion[] = [
  { id: 'A', name: 'Identification and analysis of formal qualities', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Analysis and understanding of function and purpose', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'C', name: 'Analysis and evaluation of cultural significance', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'D', name: 'Presentation and subject-specific language', maxMarks: 6, bands: LOR_BANDS_5 },
]

const FILM_COMPARATIVE: IbCriterion[] = [
  { id: 'A', name: 'Identification and analysis of film elements', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Understanding of cultural contexts', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'C', name: 'Comparison and synthesis', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'D', name: 'Presentation and use of film terminology', maxMarks: 6, bands: LOR_BANDS_5 },
]

const THEATRE_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Artistic intention and theatrical vision', maxMarks: 8, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Theatrical choices and techniques', maxMarks: 8, bands: LOR_BANDS_5 },
  { id: 'C', name: 'Performance and production skills', maxMarks: 4, bands: LOR_BANDS_5 },
]

const MUSIC_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Contextual understanding and inquiry', maxMarks: 6, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Musical analysis and experimentation', maxMarks: 8, bands: LOR_BANDS_5 },
  { id: 'C', name: 'Presentation and reflection', maxMarks: 6, bands: LOR_BANDS_5 },
]

const DANCE_CRITERIA: IbCriterion[] = [
  { id: 'A', name: 'Composition and choreographic choices', maxMarks: 10, bands: LOR_BANDS_5 },
  { id: 'B', name: 'Analysis and justification', maxMarks: 10, bands: LOR_BANDS_5 },
]

const CAS_LO_CRITERIA: IbCriterion[] = [
  { id: 'LO1', name: 'Strengths and growth', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO2', name: 'Challenge and skills', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO3', name: 'Initiative and planning', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO4', name: 'Commitment and perseverance', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO5', name: 'Collaboration', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO6', name: 'Global engagement', maxMarks: 2, bands: LOR_BANDS_5 },
  { id: 'LO7', name: 'Ethics of choices and actions', maxMarks: 2, bands: LOR_BANDS_5 },
]

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
  profile('psychology-hl', 'Psychology', 'HL', 'Individuals and Societies', 'level_of_response', 22, {
    'Paper 1': 'mixed',
    'Paper 2': 'level_of_response',
    'Paper 3': 'level_of_response',
  }, 'IB Psychology HL — ERQs marked with markbands per approach/option.'),
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
  profile('maths-aa-hl', 'Mathematics: Analysis and Approaches', 'HL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
    'Paper 3': 'point_based',
  }, 'IB Maths AA HL — method and accuracy marks.'),
  profile('maths-ai-hl', 'Mathematics: Applications and Interpretation', 'HL', 'Mathematics', 'point_based', 10, {
    'Paper 1': 'point_based',
    'Paper 2': 'point_based',
    'Paper 3': 'point_based',
  }, 'IB Maths AI HL — modelling and interpretation marks.'),

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
    'CAS reflections and learning outcomes — formative criterion-style feedback against all seven LOs.',
    CAS_LO_CRITERIA
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
    'Visual Arts HL — comparative study, process portfolio, and exhibition criteria.',
    VA_COMPARATIVE
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
    'Visual Arts SL — same components with reduced breadth expectations.',
    VA_COMPARATIVE
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
    'Theatre HL — solo piece, director\'s notebook, research presentation, collaborative project.',
    THEATRE_CRITERIA
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
    'Theatre SL — performance and research components with IB assessment criteria.',
    THEATRE_CRITERIA
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
    'Music HL — inquiry, experimentation, and presentation criteria.',
    MUSIC_CRITERIA
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
    'Music SL — musical analysis and creating criteria.',
    MUSIC_CRITERIA
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
    'Film HL — analysis, comparison, portfolio, and collaborative filmmaking.',
    FILM_COMPARATIVE
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
    'Film SL — textual analysis and portfolio criteria.',
    FILM_COMPARATIVE
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
    'Dance HL — composition, investigation, and performance criteria.',
    DANCE_CRITERIA
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
    'Dance SL — choreography and analysis markbands.',
    DANCE_CRITERIA
  ),
]

const BY_CODE = new Map(IB_MARKING_PROFILES.map((p) => [p.code, p]))

export function getIbMarkingProfile(code: string): IbMarkingProfile | null {
  return BY_CODE.get(code) ?? null
}

export function isIbSubjectCode(code: string): boolean {
  // Any `ib-` prefixed code is an IB subject. (Do NOT also require a legacy
  // marking profile: catalog subjects like `ib-maths-aa` are IB but have no
  // profile — gating on BY_CODE mis-branded them as Cambridge.)
  return code.startsWith('ib-')
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
