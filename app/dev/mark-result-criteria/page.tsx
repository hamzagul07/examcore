import { MarkingResultView, type MarkingResultData } from '@/components/MarkingResultView'
import type { IbCriterionResult } from '@/lib/marking/types'

export const metadata = {
  title: 'Mark result (IB criteria) — dev',
  robots: { index: false, follow: false },
}

/**
 * Dev preview of the full MarkingResultView on an IB multi-criterion result
 * (Extended Essay), to verify the criteria gap treatment: the lost-marks
 * headline and the per-criterion "to lift" box. Hand-written fixture, no auth.
 */
const CRITERIA: IbCriterionResult[] = [
  {
    criterion: 'A',
    criterion_name: 'Focus and method',
    level: 5,
    marks_awarded: 5,
    marks_available: 6,
    band_descriptor: 'A clearly focused research question, well-matched to the method.',
    justification: 'The question is sharp and the methodology fits it. One mark shy of the top band because the scope drifts slightly in section 3.',
    improvements: ['Tighten the scope so every section serves the research question.'],
  },
  {
    criterion: 'B',
    criterion_name: 'Knowledge and understanding',
    level: 2,
    marks_awarded: 2,
    marks_available: 6,
    band_descriptor: 'Some relevant knowledge, but sources are used descriptively.',
    justification: 'You summarise the sources accurately but rarely engage them critically or place them in the wider academic conversation — the biggest single drop on this essay.',
    improvements: [
      'Engage the sources critically — weigh them against each other rather than reporting them.',
      'Use subject terminology precisely and consistently.',
    ],
  },
  {
    criterion: 'C',
    criterion_name: 'Critical thinking',
    level: 6,
    marks_awarded: 8,
    marks_available: 12,
    band_descriptor: 'Analysis is present and mostly relevant; evaluation is developing.',
    justification: 'Strong analysis, but the argument states conclusions more than it earns them — evaluation is asserted rather than reasoned.',
    improvements: ['Support each judgement with the evidence that forces it, not after it.'],
  },
  {
    criterion: 'D',
    criterion_name: 'Presentation',
    level: 4,
    marks_awarded: 4,
    marks_available: 4,
    band_descriptor: 'Consistent, appropriate presentation throughout.',
    justification: 'Layout, referencing and structure are all to standard. Full marks.',
  },
  {
    criterion: 'E',
    criterion_name: 'Engagement',
    level: 3,
    marks_awarded: 4,
    marks_available: 6,
    band_descriptor: 'Reflection shows some engagement with the research process.',
    justification: 'The reflections describe what you did but seldom what you learned from setbacks — the assessor is looking for intellectual initiative.',
    improvements: ['Reflect on decisions and setbacks, not just actions — show what changed your thinking.'],
  },
]

const CRITERIA_RESULT: MarkingResultData = {
  marks_earned: CRITERIA.reduce((s, c) => s + c.marks_awarded, 0),
  total_marks: CRITERIA.reduce((s, c) => s + c.marks_available, 0),
  marking_mode: 'general_criteria',
  subject_code: 'ib-extended-essay',
  question_text: 'Extended Essay — History: To what extent was economic pressure the decisive cause of the 1789 fiscal crisis?',
  ai_marking: {
    marking_style: 'level_of_response',
    marks_awarded: [],
    criteria_results: CRITERIA,
    summary:
      'A focused, well-presented essay whose marks are held back by descriptive source use and asserted evaluation. Both are fixable without new research.',
    weak_topics: ['Critical engagement with sources', 'Reasoned evaluation'],
    what_to_study_next:
      'Rework the two weakest criteria: turn source summaries into a critical conversation, and make every judgement follow from its evidence.',
  },
  syllabus_tags: [],
}

export default function MarkResultCriteriaDevPage() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 12 }}>
        DEV PREVIEW · IB CRITERIA
      </p>
      <MarkingResultView result={CRITERIA_RESULT} />
    </main>
  )
}
