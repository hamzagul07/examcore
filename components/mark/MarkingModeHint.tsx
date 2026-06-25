'use client'

import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'

type Props = {
  mode: 'official' | 'general' | 'practice' | 'missing_paper'
  markBoard?: MarkExamBoard
}

export function MarkingModeHint({ mode, markBoard = 'cambridge' }: Props) {
  const ib = markBoard === 'ib'

  const copy =
    mode === 'official'
      ? {
          title: 'Official mark scheme',
          body: ib
            ? 'We found this question in our database — marking uses IB assessment criteria and markbands.'
            : 'We found this question in our database — marking uses the exact Cambridge criteria (B1, M1, A1, bands).',
        }
      : mode === 'missing_paper'
        ? {
            title: 'Paper not in database',
            body: ib
              ? 'This session is not cached yet — we mark with IB criterion conventions. Add a question photo for better accuracy.'
              : 'This session is not cached yet — we mark with general Cambridge conventions. Add a question photo for better accuracy.',
          }
        : mode === 'practice'
          ? {
              title: 'Your own question',
              body: ib
                ? 'Marked band-by-band against IB assessment criteria for your subject — not an official past-paper lookup.'
                : 'Marked with Cambridge-style conventions for your subject — not an official past-paper scheme.',
            }
          : {
              title: 'Auto-detect mode',
              body: ib
                ? 'Select your IB subject and add the question text or photo — we mark against criterion bands.'
                : 'Select the paper above for official marking, or add the question text — we will detect the paper from your script if possible.',
            }

  return (
    <div className="ms-marking-mode-hint" role="note">
      <p className="ms-marking-mode-hint-title">{copy.title}</p>
      <p className="ms-marking-mode-hint-body">{copy.body}</p>
    </div>
  )
}
