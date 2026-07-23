import { IbCriteriaBreakdown } from '@/components/mark/IbCriteriaBreakdown'
import type { IbCriterionResult } from '@/lib/marking/types'

export const metadata = {
  title: 'IB criteria — dev',
  robots: { index: false, follow: false },
}

const CRITERIA: IbCriterionResult[] = [
  {
    criterion: 'A',
    criterion_name: 'Knowing and understanding',
    level: 5,
    marks_awarded: 5,
    marks_available: 6,
    band_descriptor:
      'The response demonstrates substantial knowledge with mostly accurate use of terminology.',
    justification:
      'You define the key terms precisely and apply them correctly to the stimulus. One concept — opportunity cost — is named but not developed, which keeps this out of the top band.',
  },
  {
    criterion: 'B',
    criterion_name: 'Investigating',
    level: 3,
    marks_awarded: 3,
    marks_available: 6,
    band_descriptor:
      'A method is described but its justification is limited and sources are used unevenly.',
    justification:
      'Your data is relevant but you rely on a single source, and the method is stated rather than justified. Bringing in a second contrasting source and explaining why it was chosen would move this up.',
  },
  {
    criterion: 'C',
    criterion_name: 'Communicating',
    level: 4,
    marks_awarded: 3,
    marks_available: 4,
    band_descriptor:
      'The response is clearly structured and mostly well organised.',
    justification:
      'Clear structure and a logical line of argument. A short signposting sentence at each section would make the organisation explicit.',
  },
  {
    criterion: 'D',
    criterion_name: 'Thinking critically',
    level: 2,
    marks_awarded: 2,
    marks_available: 8,
    band_descriptor:
      'Analysis is mostly descriptive with limited evaluation of the evidence.',
    justification:
      'This is the mark that costs you most. You describe what the data shows but rarely ask whether it is reliable or what it implies. Every claim needs a "so what?" — the consequence or limitation — to earn the analysis marks.',
  },
]

export default function CriteriaPreviewPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <h1 className="ms-h2 mb-2">IB criteria breakdown</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture. The weakest criterion (D) is selected by default. Tap a tile to
        switch.
      </p>
      <div className="ms-examiner-note-card">
        <IbCriteriaBreakdown criteria={CRITERIA} />
      </div>
    </div>
  )
}
