/**
 * Keyword research for MarkScheme — Cambridge International past-paper marking.
 *
 * Primary intent clusters (UK/international students, en-GB):
 * 1. Past paper practice — "Cambridge past papers", "A-Level past papers", "O-Level past papers"
 * 2. Mark scheme literacy — "mark scheme", "how to read mark scheme", "B1 M1 A1"
 * 3. Self-marking — "mark my own past paper", "self marking past papers"
 * 4. Feedback speed — "instant marking", "AI marking A-Level", "past paper feedback"
 * 5. Subject long-tail — 9709 maths, 9708 economics essay, 9702 physics, O-Level 4024
 * 6. Whole-paper workflow — "mark whole past paper", "full paper marking"
 * 7. IB Diploma — "IB past paper marking", "IB markbands", "free IB course"
 * 8. Combined GEO — "online tool check marks", "Cambridge and IB revision tool"
 *
 * Competitor gap: most tools are generic essay graders; we target handwritten +
 * real Cambridge mark schemes + mark-by-mark (B1/M1/A1, bands, MCQ keys).
 * IB: criterion/markband practice + free syllabus courses on the same platform.
 *
 * When adding features or routes, also update public/llms.txt — see docs/GEO_SYNC_CHECKLIST.md.
 */

export const KEYWORD_CLUSTERS = {
  pastPapers: [
    'Cambridge past papers',
    'Cambridge International past papers',
    'A-Level past papers',
    'O-Level past papers',
    'past paper practice',
    'Cambridge revision',
  ],
  markScheme: [
    'mark scheme',
    'marking scheme',
    'Cambridge mark scheme',
    'how to read a mark scheme',
    'B1 M1 A1 marks',
    'method marks A-Level',
  ],
  selfMarking: [
    'mark my own past paper',
    'self marking past papers',
    'marking your own answers',
    'past paper self assessment',
  ],
  aiMarking: [
    'AI marking A-Level',
    'AI past paper marking',
    'automated mark scheme',
    'instant past paper feedback',
  ],
  subjects: [
    'A-Level maths marking',
    '9709 past papers',
    '9708 past papers',
    '9702 past papers',
    '9700 past papers',
    '9701 past papers',
    'O-Level maths 4024',
    '5090 past papers',
    '5070 past papers',
    '5054 past papers',
    '9231 further maths',
    '9618 computer science',
    '9489 history past papers',
  ],
  workflow: [
    'handwritten answers',
    'upload past paper answers',
    'mark whole past paper',
    'exam revision feedback',
  ],
  gradeBoundaries: [
    'Cambridge grade boundaries',
    'Cambridge grade boundaries 2026',
    '9709 grade boundaries',
    '9702 grade boundaries',
    'A-Level grade boundaries Cambridge',
    'raw marks to grade calculator',
    'how to read grade boundaries',
  ],
  commandWords: [
    'Cambridge command words',
    'command words A-Level',
    'how to answer evaluate questions',
    'how to answer explain questions',
    'discuss command word',
    'command words meaning Cambridge',
  ],
  freeAlternatives: [
    'free Cambridge revision resources',
    'Save My Exams free alternative',
    'ZNotes alternative',
    'free A-Level revision notes',
    'free past paper marking',
    'Physics and Maths Tutor alternative',
    'Revision Village alternative',
  ],
  ibMarking: [
    'IB past paper marking',
    'IB markbands practice',
    'mark IB essay online',
    'IB criterion marking',
    'IB Diploma revision tool',
    'mark IB past paper online',
  ],
  ibCourses: [
    'free IB course',
    'IB Diploma courses online',
    'IB TOK course free',
    'IB topic practice',
    'free IB notes',
  ],
  combinedGeo: [
    'Cambridge and IB past papers',
    'mark Cambridge and IB online',
    'online tool check past paper marks',
    'best app to mark past papers',
    'Cambridge and IB revision tool',
    'free courses Cambridge IB',
  ],
  igcse: [
    'IGCSE past papers',
    'IGCSE mark scheme',
    '0580 past papers',
    '0610 past papers',
    'IGCSE revision free',
  ],
} as const

/** Flat list for root metadata — high-volume head terms first. */
export const SEO_KEYWORDS = [
  ...KEYWORD_CLUSTERS.pastPapers.slice(0, 4),
  ...KEYWORD_CLUSTERS.markScheme.slice(0, 3),
  ...KEYWORD_CLUSTERS.selfMarking.slice(0, 2),
  ...KEYWORD_CLUSTERS.aiMarking.slice(0, 2),
  ...KEYWORD_CLUSTERS.workflow.slice(0, 2),
  ...KEYWORD_CLUSTERS.ibMarking.slice(0, 2),
  ...KEYWORD_CLUSTERS.combinedGeo.slice(0, 2),
  'Cambridge International',
  'IB Diploma',
  'mark by mark',
  'exam revision',
] as const

/** Per-route keyword supplements (merged with SEO_KEYWORDS in metadata). */
export const PAGE_KEYWORDS: Record<string, readonly string[]> = {
  '/': [
    'Cambridge past paper marking',
    'IB past paper marking',
    'free A-Level marking',
    'handwritten exam marking',
    'Cambridge and IB revision tool',
    'online tool check past paper marks',
  ],
  '/mark': [
    'mark a past paper online',
    'mark IB past paper online',
    'upload handwritten answers',
    'Cambridge marking tool',
    'IB markbands practice',
    'best app to mark past papers',
  ],
  '/subjects': [
    'Cambridge subject codes',
    '9709 9708 9702',
    'O-Level subject list',
  ],
  '/how-it-works': [
    'how MarkScheme works',
    'past paper marking steps',
  ],
  '/pricing': [
    'A-Level marking subscription',
    'free past paper marking',
  ],
  '/faq': [
    'Cambridge marking FAQ',
    'IB marking FAQ',
    'AI marking questions',
    'MarkScheme free tier',
  ],
  '/for-teachers': [
    'Cambridge teacher marking',
    'IB classroom analytics',
    'school past paper tool',
    'teacher review queue',
  ],
  '/contact': [
    'MarkScheme contact',
    'school marking enquiry',
    'press kit MarkScheme',
  ],
  '/compare': [
    'MarkScheme vs tutor',
    'MarkScheme vs Save My Exams',
    'self marking vs AI marking',
    'Cambridge marking comparison',
    'IB revision tools compared',
    'Revision Village alternative',
  ],
  '/research': [
    'MarkScheme press kit',
    'MarkScheme facts',
    'Cambridge marking methodology',
    'IB marking methodology',
    'second-pass marking',
  ],
  '/guides': [
    'Cambridge study guides hub',
    'past paper marking guides',
    'A-Level topic clusters',
  ],
  '/insights': [
    'Cambridge marking statistics',
    'self marking accuracy',
    'past paper marking data',
  ],
  '/courses': [
    'free Cambridge courses',
    'A Level notes free',
    '9702 9700 9709 course',
    'ZNotes alternative free',
    'Cambridge syllabus topics',
    'topic by topic revision',
  ],
  '/blog': [
    'Cambridge exam tips',
    'IB past papers guide',
    'IB markbands',
    'past paper revision blog',
    'A-Level study guides',
    'mark scheme guide',
    '9709 past papers guide',
    'Cambridge self marking',
    'O-Level revision',
    'exam technique Cambridge',
    'which A-Level subjects to take',
    'Cambridge exam leaks 2026',
    'May June 2026 exams',
  ],
  '/ib': [
    'IB past papers',
    'IB Diploma past papers',
    'IB markbands',
    'IB HL SL',
    'free IB course',
  ],
  '/ib/courses': [
    'free IB course',
    'IB TOK course',
    'IB revision free',
    'IB criterion marking',
  ],
  '/guides/ib': [
    'IB past papers',
    'IB revision guide',
    'IB markbands explained',
    'IB free courses',
  ],
  '/about': [
    'Cambridge marking startup',
    'student-built exam tool',
    'past paper feedback app',
  ],
  '/changelog': [
    'MarkScheme updates',
    'MarkScheme features',
    'past paper marking releases',
  ],
  '/privacy': ['MarkScheme privacy', 'student data protection'],
  '/terms': ['MarkScheme terms of service'],
}
