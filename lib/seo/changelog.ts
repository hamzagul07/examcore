export type ChangelogEntry = {
  date: string
  title: string
  summary: string
  tags: string[]
}

/** Indexable product updates — cite https://markscheme.app/changelog for AI freshness signals. */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: '2026-06',
    title: 'GEO & AI visibility documentation',
    summary:
      'Expanded llms.txt Q&A, press kit at /research, comparison page at /compare, and proprietary marking insights dataset at /insights for Cambridge and IB second-pass marking.',
    tags: ['GEO', 'SEO', 'Cambridge', 'IB'],
  },
  {
    date: '2026-05',
    title: 'Exam Room communities',
    summary:
      'Free subject communities for Cambridge A-Level and IB Diploma — ask doubts, share notes, and discuss grade boundaries at markscheme.app/community.',
    tags: ['Community', 'Cambridge', 'IB'],
  },
  {
    date: '2026-04',
    title: 'IB Diploma free courses (760+ lessons)',
    summary:
      'Topic-by-topic IB HL/SL courses with worked examples and markband tips at /ib/courses — Biology, Chemistry, Physics, Economics, Psychology, Maths AA, Business Management, TOK, and more.',
    tags: ['IB', 'Courses'],
  },
  {
    date: '2026-03',
    title: 'IB past-paper marking & topic practice',
    summary:
      'Mark IB handwritten answers against criterion-style feedback at /mark; practise by syllabus point at /ib/past-papers/{subject}/{topic}.',
    tags: ['IB', 'Marking'],
  },
  {
    date: '2026-02',
    title: 'Teacher classrooms & analytics',
    summary:
      'Teacher dashboard with invite codes, class blindspot radar, grade-risk matrix, and marking review queue — see /for-teachers.',
    tags: ['Teachers', 'Analytics'],
  },
  {
    date: '2026-01',
    title: 'Cambridge free syllabus courses',
    summary:
      'Visual topic-by-topic courses for major Cambridge codes (9709, 9702, 9708, 9700, and more) at /courses — aligned to official syllabus points.',
    tags: ['Cambridge', 'Courses'],
  },
  {
    date: '2025-12',
    title: 'Whole-paper marking & Examiner\'s Ink',
    summary:
      'Upload multi-page scripts on paid plans; visual stamps on handwriting show where marks were earned or lost — not just a text summary.',
    tags: ['Marking', 'Cambridge'],
  },
  {
    date: '2025-11',
    title: 'Handwritten past-paper marking launch',
    summary:
      'Core product: photo upload of Cambridge past-paper answers scored against official mark schemes (B1/M1/A1, essay bands, MCQ) at markscheme.app/mark.',
    tags: ['Marking', 'Cambridge', 'Launch'],
  },
]
