import { MarkingResultView, type MarkingResultData } from '@/components/MarkingResultView'

export const metadata = {
  title: 'Mark result (level of response) — dev',
  robots: { index: false, follow: false },
}

/**
 * Dev preview of the FULL MarkingResultView on a level-of-response essay, to
 * verify the band-ladder wiring lands in the real result grid. No auth, no DB —
 * a hand-written fixture (no student's work, no signed URLs).
 */
const LOR_RESULT: MarkingResultData = {
  marks_earned: 5,
  total_marks: 12,
  marking_mode: 'official_mark_scheme',
  subject_code: '9708',
  question_text:
    "'A firm should always aim to maximise profit.' Evaluate this view. [12]",
  detected_paper: {
    paper_code: '9708/23',
    paper_session: 'May/June 2023',
    question_number: '6',
  },
  ai_marking: {
    marking_style: 'level_of_response',
    marks_awarded: [],
    band_result: {
      level: 2,
      marks_awarded: 5,
      marks_available: 12,
      band_descriptor: 'Developed explanation of both sides of the argument.',
      justification:
        'You explain profit maximisation and set against it alternative objectives (survival, market share, satisficing) with sound theory. But the answer describes both sides and stops — there is no judgement, so it sits in Level 2.',
      improvements: [
        'Reach a supported conclusion: state when profit maximisation is or is not the right objective and back it with your strongest point.',
      ],
    },
    full_marks_rewrite: {
      rewritten_answer: '…',
      annotations: [
        {
          text: 'Conclude: "In the short run a new entrant should prioritise market share over profit, because…" and justify with your earlier point on predatory pricing.',
          earns: 'lifts the answer to Level 3',
        },
      ],
    },
    summary:
      'Strong command of the theory and a genuinely two-sided answer — the reason it lands in Level 2 rather than Level 3 is the missing judgement, not missing knowledge.',
    weak_topics: ['Evaluation', 'Reaching a supported judgement'],
    what_to_study_next:
      'Practise ending every evaluate question with a one-paragraph judgement that commits to a position and defends it against the strongest counter-point.',
  },
  mark_scheme_rubric: {
    style: 'level_of_response',
    points: [],
    bands: [
      { level: 1, marks_min: 1, marks_max: 3, descriptor: 'Basic points, largely descriptive.' },
      { level: 2, marks_min: 4, marks_max: 6, descriptor: 'Developed explanation of both sides of the argument.' },
      { level: 3, marks_min: 7, marks_max: 9, descriptor: 'Reasoned analysis leading to a supported judgement.' },
      { level: 4, marks_min: 10, marks_max: 12, descriptor: 'Sustained evaluation with a well-defended conclusion.' },
    ],
    indicative_content: [],
    common_errors: [],
    notes: null,
    acceptable_final_answers: [],
    assessment_objectives: ['AO3 Analysis', 'AO4 Evaluation'],
  },
  syllabus_tags: [],
}

export default function MarkResultLorDevPage() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 12 }}>
        DEV PREVIEW · LEVEL OF RESPONSE
      </p>
      <MarkingResultView result={LOR_RESULT} />
    </main>
  )
}
