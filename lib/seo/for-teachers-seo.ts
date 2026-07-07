import type { FaqItem } from '@/lib/faq-data'

export const FOR_TEACHERS_SEO_FAQ: FaqItem[] = [
  {
    q: 'How do teachers get started with MarkScheme?',
    a: 'Sign up, open the teacher dashboard at markscheme.app/teacher, and create a classroom. Share the invite code with students — they join from their account and mark past papers as usual.',
  },
  {
    q: 'What can teachers see about student marking?',
    a: 'Class dashboards show attempt counts, average scores, topic blindspots across the class, grade-risk quadrants, and a review queue where you can override AI marks when needed.',
  },
  {
    q: 'Is MarkScheme affiliated with Cambridge or the IB?',
    a: 'No — MarkScheme is an independent revision tool. It uses official published mark schemes and IB markband language but is not endorsed by Cambridge International or the IBO.',
  },
  {
    q: 'Can schools use MarkScheme for homework marking?',
    a: 'Many teachers use it for formative past-paper practice — students self-mark first, then MarkScheme gives a second pass. It is not a replacement for formal school assessment or examiner training.',
  },
  {
    q: 'How do I contact MarkScheme about school licences?',
    a: 'Email hello@markscheme.app with your school name, subjects, and approximate student count. Individual student accounts work today; bulk or SSO options are discussed case by case.',
  },
]

export const TEACHER_FEATURES = [
  {
    title: 'Classrooms & invite codes',
    detail: 'Create a class, share a code, and students join in one step — no manual roster imports required.',
  },
  {
    title: 'Blindspot radar',
    detail: 'See which syllabus topics the whole class struggles with after marking attempts — prioritise revision before mocks.',
  },
  {
    title: 'Grade risk matrix',
    detail: 'Plot students by effort vs accuracy so you spot who is working hard but still losing method marks.',
  },
  {
    title: 'Review queue',
    detail: 'Override AI marks when you disagree — your judgement is recorded for that attempt.',
  },
  {
    title: 'Same marking engine as students',
    detail: 'Students upload handwriting to /mark; teachers get analytics on top of scheme-aligned Cambridge and IB feedback.',
  },
] as const
