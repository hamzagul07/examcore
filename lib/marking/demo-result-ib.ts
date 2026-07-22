import type { MarkingResultData } from '@/components/MarkingResultView'

/**
 * The IB counterpart to DEMO_MARK_RESULT.
 *
 * The Cambridge example was rendering on every blog article, including the ~174
 * IB posts that are deliberately kept free of Cambridge references (enforced by
 * lib/seo/ib-blog-copy.test.ts — which scans the markdown, so a component could
 * slip Cambridge terminology onto those pages unseen). An IB student reading
 * "A-Level Maths, paper 9709/12" is being shown a qualification they are not
 * sitting.
 *
 * Two constraints this fixture respects:
 *
 *  1. No Cambridge identifiers of any kind — no A-Level, no syllabus code, no
 *     session string.
 *  2. Marked against IB assessment criteria, never described as an "official IB
 *     mark scheme". The product holds no official IB schemes, so claiming one
 *     would be false. `marking_mode` is set accordingly.
 *
 * The notation is genuine IB: M for method, A for accuracy, and R for
 * reasoning. R is the natural mark to withhold here, since it is literally the
 * mark for justifying a conclusion — the same teaching point as the Cambridge
 * example, expressed in the notation an IB student will actually meet.
 */
export const DEMO_MARK_RESULT_IB: MarkingResultData = {
  marks_earned: 4,
  total_marks: 5,
  // Not an official scheme — see the note above.
  marking_mode: 'general_criteria_practice',
  subject_code: 'ib-maths-aa',
  question_text:
    'The function f is defined by f(x) = x³ − 3x² + 4. Find the coordinates of the local maximum and the local minimum of f, justifying your answer. [5]',
  detected_paper: null,
  time_spent_seconds: 94,
  ocr_text: [
    "f'(x) = 3x^2 - 6x",
    '3x^2 - 6x = 0',
    '3x(x - 2) = 0',
    'x = 0 or x = 2',
    'f(0) = 4, f(2) = 8 - 12 + 4 = 0',
    'local max (0, 4), local min (2, 0)',
  ].join('\n'),
  ai_marking: {
    marking_style: 'point_based',
    marks_awarded: [
      {
        mark_id: 1,
        type: 'M1',
        earned: true,
        reasoning:
          'Correct method: you differentiated f and set the derivative equal to zero to locate the stationary points.',
        line_reference: "f'(x) = 3x^2 - 6x",
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 2,
        type: 'A1',
        earned: true,
        reasoning:
          "The derivative f'(x) = 3x² − 6x is completely correct, including the constant differentiating to zero.",
        line_reference: '3x^2 - 6x = 0',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 3,
        type: 'A1',
        earned: true,
        reasoning:
          'Both x-values found correctly by factorising: x = 0 and x = 2.',
        line_reference: 'x = 0 or x = 2',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 4,
        type: 'A1',
        earned: true,
        reasoning:
          'Both sets of coordinates are correct — (0, 4) and (2, 0). Substitution back into f was accurate.',
        line_reference: 'f(0) = 4, f(2) = 8 - 12 + 4 = 0',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 5,
        type: 'R1',
        earned: false,
        reasoning:
          'The question says "justifying your answer", and R marks are awarded for the reasoning itself — not for the conclusion. Naming which point is the maximum earns nothing on its own. Evaluate f″(x) = 6x − 6 at each point (−6 at x = 0, +6 at x = 2), or show the sign of f′ either side. Two lines of working convert this mark.',
        line_reference: 'local max (0, 4), local min (2, 0)',
        error_classification: 'incomplete_method',
        margin_note: 'Stated, not justified — R marks pay for the reasoning',
      },
    ],
    summary:
      'Clean differentiation and both sets of coordinates correct — the analytical work here is sound. The mark you lost is the R mark, which exists specifically to reward justification. Because the question asks you to justify, naming the maximum and minimum without showing how you decided earns nothing, even though both labels are right.',
    weak_topics: ['Justifying stationary points', 'Second derivative test'],
    what_to_study_next:
      'Whenever a question says "justify", "show that" or "hence", treat the reasoning as the mark rather than the answer. On stationary points that means writing f″(x), substituting each x-value and stating the sign.',
  },
  syllabus_tags: [],
  mark_scheme_meta: null,
}
