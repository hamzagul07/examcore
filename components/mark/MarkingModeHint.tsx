'use client'

type Props = {
  mode: 'official' | 'general' | 'practice' | 'missing_paper'
}

export function MarkingModeHint({ mode }: Props) {
  const copy =
    mode === 'official'
      ? {
          title: 'Official mark scheme',
          body: 'We found this question in our database — marking uses the exact Cambridge criteria (B1, M1, A1, bands).',
        }
      : mode === 'missing_paper'
        ? {
            title: 'Paper not in database',
            body: 'This session is not cached yet — we mark with general Cambridge conventions. Add a question photo for better accuracy.',
          }
        : mode === 'practice'
          ? {
              title: 'Your own question',
              body: 'Marked with Cambridge-style conventions for your subject — not an official past-paper scheme.',
            }
          : {
              title: 'Auto-detect mode',
              body: 'Select the paper above for official marking, or add the question text — we will detect the paper from your script if possible.',
            }

  return (
    <div className="ms-marking-mode-hint">
      <p className="ms-marking-mode-hint-title">{copy.title}</p>
      <p className="ms-marking-mode-hint-body">{copy.body}</p>
    </div>
  )
}
