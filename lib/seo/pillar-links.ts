/**
 * Curated internal links — distributes PageRank to money + editorial URLs.
 * Used in footer, blog sidebar blocks, and optional homepage hub.
 */
export type PillarLink = {
  href: string
  label: string
  description: string
}

export const SEO_PILLAR_LINKS: PillarLink[] = [
  {
    href: '/insights',
    label: 'Marking benchmarks (dataset)',
    description: 'Original self-marking gap statistics — citable',
  },
  {
    href: '/guides',
    label: 'Topic guides (hubs)',
    description: '11 clusters — marking, mark schemes, grade boundaries, command words, subjects',
  },
  {
    href: '/tools/grade-boundary-calculator',
    label: 'Grade boundary calculator',
    description: 'Turn raw marks into a Cambridge A*–E grade',
  },
  {
    href: '/tools/command-words',
    label: 'Command words explainer',
    description: 'What every Cambridge command word requires',
  },
  {
    href: '/mark',
    label: 'Mark a past paper free',
    description: 'Upload handwriting — get mark-by-mark feedback',
  },
  {
    href: '/blog/how-to-mark-cambridge-past-papers-yourself',
    label: 'How to self-mark past papers',
    description: 'Strict marking workflow that moves grades',
  },
  {
    href: '/blog/which-cambridge-a-level-subjects-should-you-take-2026',
    label: 'Which A-Levels to take',
    description: 'Subject choice for 2026 university routes',
  },
  {
    href: '/blog/cambridge-9709-a-level-mathematics-past-papers-guide',
    label: '9709 Maths guide',
    description: 'B1/M1/A1, papers, revision plan',
  },
  {
    href: '/blog/cambridge-exam-paper-leaks-2026-what-students-should-know',
    label: 'Exam leaks & integrity',
    description: 'What to do instead of chasing rumours',
  },
  {
    href: '/blog/ai-marking-cambridge-past-papers-guide',
    label: 'AI marking guide',
    description: 'Honest limits vs mark schemes',
  },
  {
    href: '/subjects',
    label: 'All subjects',
    description: 'Every syllabus code we mark',
  },
  {
    href: '/pricing',
    label: 'Pricing',
    description: 'Free tier and paid plans',
  },
]

export const SEO_SUBJECT_LINKS: PillarLink[] = [
  { href: '/blog/cambridge-9709-a-level-mathematics-past-papers-guide', label: '9709 Maths', description: 'A-Level Mathematics' },
  { href: '/blog/cambridge-9702-a-level-physics-past-papers-guide', label: '9702 Physics', description: 'A-Level Physics' },
  { href: '/blog/cambridge-9708-a-level-economics-past-papers-guide', label: '9708 Economics', description: 'A-Level Economics' },
  { href: '/blog/cambridge-9700-a-level-biology-past-papers-guide', label: '9700 Biology', description: 'A-Level Biology' },
  { href: '/blog/cambridge-9701-a-level-chemistry-past-papers-guide', label: '9701 Chemistry', description: 'A-Level Chemistry' },
  { href: '/blog/cambridge-4024-o-level-mathematics-past-papers-guide', label: '4024 O-Level Maths', description: 'O-Level Mathematics' },
]

export const SEO_IB_PILLAR_LINKS: PillarLink[] = [
  {
    href: '/guides/ib',
    label: 'IB Diploma guide hub',
    description: 'Past papers, markbands, IA & revision — every IB article',
  },
  {
    href: '/ib',
    label: 'IB past papers directory',
    description: 'HL & SL papers by subject, session and paper',
  },
  {
    href: '/ib/courses',
    label: 'Free IB courses (760+ lessons)',
    description: 'TOK, EE, sciences, maths, languages & Group 6 arts',
  },
  {
    href: '/blog/ib-diploma-past-papers-guide',
    label: 'IB past papers workflow',
    description: 'How to use papers and markbands to move your grade',
  },
  {
    href: '/blog/ib-free-courses-guide',
    label: 'Free IB courses guide',
    description: 'Every HL, SL and Core course with criterion marking',
  },
  {
    href: '/blog/ib-markbands-explained',
    label: 'IB markbands explained',
    description: 'How examiners place answers in level bands',
  },
  {
    href: '/blog/ib-internal-assessment-complete-guide',
    label: 'IB Internal Assessment guide',
    description: 'IA criteria, timelines and top-band habits',
  },
  {
    href: '/ib/past-papers/biology-hl#ib-topic-practice',
    label: 'IB topic practice',
    description: 'Syllabus-by-syllabus grids linked to lessons & marking',
  },
  {
    href: '/mark',
    label: 'IB criterion marking',
    description: 'Upload answers for band-by-band IB feedback',
  },
]

export const SEO_IB_SUBJECT_LINKS: PillarLink[] = [
  { href: '/blog/ib-biology-hl-past-papers-guide', label: 'Biology HL', description: 'IB Biology Higher Level' },
  { href: '/blog/ib-chemistry-hl-past-papers-guide', label: 'Chemistry HL', description: 'IB Chemistry Higher Level' },
  { href: '/blog/ib-maths-aa-hl-past-papers-guide', label: 'Maths AA HL', description: 'Analysis & Approaches HL' },
  { href: '/blog/ib-history-hl-past-papers-guide', label: 'History HL', description: 'IB History Higher Level' },
  { href: '/blog/ib-tok-past-papers-guide', label: 'TOK', description: 'Theory of Knowledge essay & exhibition' },
  { href: '/blog/ib-economics-hl-past-papers-guide', label: 'Economics HL', description: 'IB Economics Higher Level' },
]
