import type { FaqItem } from '@/lib/faq-data'

/**
 * Copy for /for-teachers — the FAQ (also emitted as FAQPage JSON-LD) and the
 * "week at the desk" walkthrough. Kept here, not in the page, so the claims
 * the page makes and the claims structured data makes cannot drift apart.
 *
 * Every line describes what the teacher system actually does (docs/
 * teacher-system.md). Vocabulary follows the product: a "set" of work, the
 * "blindspot report" (never "radar"), "speed" (never "effort").
 */
export const FOR_TEACHERS_SEO_FAQ: FaqItem[] = [
  {
    q: 'How do teachers get started with MarkScheme?',
    a: 'Sign up, then open markscheme.app/for-teachers/start: pick your board, level and subject and name the class — about thirty seconds. You get a six-letter code to read out; students join at markscheme.app/join. Your desk is at /teacher/dashboard.',
  },
  {
    q: 'Can I set homework and see who handed it in?',
    a: 'Yes. Set past-paper questions, a whole paper, a topic drill or your own practice prompt, with a due date. Students mark their handwriting from the set, and the class matrix fills in as they do: handed in, late, reviewed, missing or excused, with each mark. A student who marks the same question from /mark instead is matched to the set too.',
  },
  {
    q: 'What can teachers see about student marking?',
    a: 'Work your students mark in your class’s subject from the day they join: marks per question, the blindspot report of topics the class keeps dropping marks on, students who have gone quiet or are improving, and a review queue. You never see email addresses, work from before they joined, or anything after they leave the class.',
  },
  {
    q: 'Can I change a mark the AI gave?',
    a: 'Yes. In Reviews you confirm a mark, re-mark it point by point with a note, or flag it. Scripts where a second look matters most — mocks, marks near a grade boundary, results unusual for that student — come first, each with the reason. You choose whether the student sees your decision, and you can leave written feedback on any script.',
  },
  {
    q: 'Is it free for teachers?',
    a: 'Classes, sets, the class matrix, reviews, feedback, exports and the Sunday digest are free. A verified teacher seat — checked against your school email — adds 300 marks a month for your own marking, and each student in your classes gets extra marks a month on top of their own allowance.',
  },
  {
    q: 'Is MarkScheme affiliated with Cambridge or the IB?',
    a: 'No — MarkScheme is an independent revision tool. It uses official published mark schemes and IB markband language but is not endorsed by Cambridge International or the IBO.',
  },
  {
    q: 'How do I contact MarkScheme about my school?',
    a: 'Email hello@markscheme.app with your school name, subjects and approximate student count. Individual teacher and student accounts work today; anything school-wide is discussed case by case.',
  },
]

/** A teacher's week, as the page walks through it. `glyph` names an InkGlyph. */
export const TEACHER_WEEK = [
  {
    when: 'MON',
    glyph: 'notes',
    title: 'Set the work',
    detail:
      'Pick questions by paper and session, a whole paper, a topic drill that chooses questions for each syllabus point, or write your own prompt. Give it a due date — or a timed window for a mock — and publish. Students get it on their dashboard and by email.',
  },
  {
    when: 'WED',
    glyph: 'tick',
    title: 'See who has handed in',
    detail:
      'Every student is a row, every question a column: ✓ 7/9 when it is in, L when it came in late, a dash when it has not. Remind the ones who are missing in one tap; excuse or extend for anyone who needs it.',
  },
  {
    when: 'FRI',
    glyph: 'cards',
    title: 'Review the scripts that need you',
    detail:
      'The review queue puts first the scripts where a second look is worth most — mocks, marks near a grade boundary, zeros that may be a bad photo, results unusual for that student — and says why each is there. Confirm, re-mark point by point, or flag, and leave a note in the margin.',
  },
  {
    when: 'SUN',
    glyph: 'progress',
    title: 'Read the week in one email',
    detail:
      'Per class: handed in, late, the class mean, the gap most of them share, and how many scripts still wait for you. Nothing to log into.',
  },
  {
    when: 'MON',
    glyph: 'arrow',
    title: 'Reteach the gap',
    detail:
      'The desk names the headline gap of the last set — “they earn the method marks and drop the accuracy marks on integration” — and the students who share one mistake. Print a handout, or set a short drill to just those students.',
  },
] as const
