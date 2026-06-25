'use client'

export type MarkExamBoard = 'cambridge' | 'ib'

const OPTIONS: {
  id: MarkExamBoard
  label: string
  hint: string
}[] = [
  {
    id: 'cambridge',
    label: 'Cambridge International',
    hint: 'Past papers & B1/M1/A1 marking',
  },
  {
    id: 'ib',
    label: 'IB Diploma',
    hint: 'Criterion bands · HL, SL & Core',
  },
]

type Props = {
  value: MarkExamBoard
  onChange: (board: MarkExamBoard) => void
  disabled?: boolean
}

export function MarkBoardPicker({ value, onChange, disabled }: Props) {
  return (
    <fieldset className="ms-mark-board-picker" disabled={disabled}>
      <legend className="label-overline mb-2.5 block">Exam board</legend>
      <p className="ms-mark-board-hint mb-3 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Pick the board your question belongs to — we apply the right mark scheme style.
      </p>
      <div className="ms-mark-board-grid">
        {OPTIONS.map((opt) => {
          const inputId = `mark-board-${opt.id}`
          return (
            <label
              key={opt.id}
              htmlFor={inputId}
              className={`ms-mark-board-option${value === opt.id ? ' on' : ''}`}
            >
              <input
                id={inputId}
                type="radio"
                name="mark-exam-board"
                value={opt.id}
                checked={value === opt.id}
                disabled={disabled}
                onChange={() => onChange(opt.id)}
                className="ms-mark-board-option-input"
              />
              <span className="ms-mark-board-option-label">{opt.label}</span>
              <span className="ms-mark-board-option-hint">{opt.hint}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function markBoardFromProfileBoard(board: string | null | undefined): MarkExamBoard {
  return board === 'IB' ? 'ib' : 'cambridge'
}

export function subjectMatchesMarkBoard(code: string, markBoard: MarkExamBoard): boolean {
  return markBoard === 'ib' ? code.startsWith('ib-') : !code.startsWith('ib-')
}
