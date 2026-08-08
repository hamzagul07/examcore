'use client'

import { resolveBoard } from '@/lib/courses/board'
import {
  getExamSystemByProfileBoardId,
  listMarkingExamSystems,
  type ExamSystemId,
} from '@/lib/exam-systems'

/** Boards that currently accept marks on /mark (driven by adapter.markingEnabled). */
export type MarkExamBoard = Extract<ExamSystemId, 'cambridge' | 'ib' | 'edexcel'>

const OPTIONS = listMarkingExamSystems()
  .filter((sys): sys is typeof sys & { id: MarkExamBoard } =>
    sys.id === 'cambridge' || sys.id === 'ib' || sys.id === 'edexcel'
  )
  .map((sys) => ({
    id: sys.id,
    label: sys.label,
    hint: sys.markPickerHint,
  }))

type Props = {
  value: MarkExamBoard
  onChange: (board: MarkExamBoard) => void
  disabled?: boolean
}

export function MarkBoardPicker({ value, onChange, disabled }: Props) {
  const labels = OPTIONS.map((o) => o.label)
  const labelText =
    labels.length <= 1
      ? labels[0] ?? 'your board'
      : labels.length === 2
        ? `${labels[0]} and ${labels[1]}`
        : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`

  return (
    <fieldset className="ms-mark-board-picker" disabled={disabled}>
      <legend className="label-overline mb-2.5 block">Exam board</legend>
      <p className="ms-mark-board-hint mb-3 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Pick your board — {labelText} support photos, PDFs, and scanned worksheets.
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
  const sys = board ? getExamSystemByProfileBoardId(board) : null
  if (
    sys?.markingEnabled &&
    (sys.id === 'cambridge' || sys.id === 'ib' || sys.id === 'edexcel')
  ) {
    return sys.id
  }
  if (board === 'IB') return 'ib'
  if (board === 'Edexcel') return 'edexcel'
  return 'cambridge'
}

export function subjectMatchesMarkBoard(code: string, markBoard: MarkExamBoard): boolean {
  return resolveBoard(code) === markBoard
}

/** Past-paper lookup + whole-paper are Cambridge-only until other boards have scheme banks. */
export function boardSupportsPastPaperLookup(board: MarkExamBoard): boolean {
  return board === 'cambridge'
}

export function boardSupportsWholePaper(board: MarkExamBoard): boolean {
  return board === 'cambridge'
}
