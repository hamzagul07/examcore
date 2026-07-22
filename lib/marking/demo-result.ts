import type { MarkingResultData } from '@/components/MarkingResultView'

/**
 * A finished mark, shown instantly and with no upload.
 *
 * Measured problem: of the users who reached /mark, roughly four in five sat on
 * the page for about a minute and left without uploading anything. They never
 * reached the marking latency at all — they bounced off an empty uploader with
 * no idea what they'd get back. This is the answer to "what does this actually
 * give me?", answered in a second rather than in three minutes.
 *
 * Deliberately hand-written rather than a snapshot of a real attempt: no
 * student's work is reproduced, and there are no signed photo URLs to expire.
 * A mark is dropped on purpose — the feedback on a lost mark is the product.
 */
export const DEMO_MARK_RESULT: MarkingResultData = {
  marks_earned: 4,
  total_marks: 5,
  marking_mode: 'official_mark_scheme',
  subject_code: '9709',
  question_text:
    'The curve C has equation y = x³ − 6x² + 9x + 1. Find the coordinates of the stationary points of C and determine the nature of each. [5]',
  detected_paper: {
    paper_code: '9709/12',
    paper_session: 'May/June 2023',
    question_number: '7',
  },
  time_spent_seconds: 96,
  ocr_text: [
    'dy/dx = 3x^2 - 12x + 9',
    '3x^2 - 12x + 9 = 0',
    'x^2 - 4x + 3 = 0',
    '(x - 1)(x - 3) = 0',
    'x = 1 or x = 3',
    'When x = 1, y = 1 - 6 + 9 + 1 = 5',
    'When x = 3, y = 27 - 54 + 27 + 1 = 1',
    'So stationary points are (1, 5) and (3, 1)',
    '(1, 5) is a maximum and (3, 1) is a minimum',
  ].join('\n'),
  ai_marking: {
    marking_style: 'point_based',
    marks_awarded: [
      {
        mark_id: 1,
        type: 'M1',
        earned: true,
        reasoning:
          'Differentiated correctly to get dy/dx = 3x² − 12x + 9. Every term is right, including the constant vanishing.',
        line_reference: 'dy/dx = 3x^2 - 12x + 9',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 2,
        type: 'M1',
        earned: true,
        reasoning:
          'Set the derivative to zero and factorised cleanly. Dividing through by 3 first is exactly what the examiner wants to see.',
        line_reference: '(x - 1)(x - 3) = 0',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 3,
        type: 'A1',
        earned: true,
        reasoning: 'Both x-values correct: x = 1 and x = 3.',
        line_reference: 'x = 1 or x = 3',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 4,
        type: 'A1',
        earned: true,
        reasoning:
          'Both sets of coordinates correct — (1, 5) and (3, 1). Substitution back into the original equation was accurate.',
        line_reference: 'So stationary points are (1, 5) and (3, 1)',
        error_classification: 'no_error',
        margin_note: null,
      },
      {
        mark_id: 5,
        type: 'B1',
        earned: false,
        reasoning:
          'You stated the nature of each point correctly, but stated it without justification. This mark needs the reasoning shown — either evaluate the second derivative (d²y/dx² = 6x − 12, giving −6 at x = 1 and +6 at x = 3) or show a sign change of dy/dx either side of each point. An unsupported assertion earns nothing here even when the conclusion is right.',
        line_reference: '(1, 5) is a maximum and (3, 1) is a minimum',
        error_classification: 'incomplete_method',
        margin_note: 'Correct conclusion, no justification shown',
      },
    ],
    summary:
      'Confident, well-organised differentiation — the algebra is clean and every coordinate is right. You lost the final mark for asserting the nature of each stationary point instead of proving it. This is the single most common way marks leak on this question type: the examiner is paying for the justification, not the conclusion.',
    weak_topics: ['Second derivative test', 'Justifying conclusions'],
    what_to_study_next:
      'Practise finishing every stationary-point question with an explicit second-derivative evaluation. Write d²y/dx², substitute each x-value, and state the sign — three extra lines that reliably convert to a mark.',
  },
  syllabus_tags: [],
  mark_scheme_meta: {
    total_marks: 5,
    marking_type: 'point_based',
    syllabus_tags: [],
    question_number: '7',
    paper_code: '9709/12',
    paper_session: 'May/June 2023',
  },
}

/** Query flag that opens the example straight away (used by onboarding). */
export const DEMO_MARK_QUERY_PARAM = 'example'
