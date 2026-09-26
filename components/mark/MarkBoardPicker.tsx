'use client'

import { resolveBoard } from '@/lib/courses/board'
import {
  getExamSystemByProfileBoardId,
  listMarkingExamSystems,
  type ExamSystemId,
} from '@/lib/exam-systems'

/** Boards that currently accept marks on /mark (driven by adapter.markingEnabled). */
export type MarkExamBoard = ExamSystemId

const OPTIONS = listMarkingExamSystems().map((sys) => ({
  id: sys.id as MarkExamBoard,
  label: sys.label,
  hint: sys.markPickerHint,
}))

type Props = {
  value: MarkExamBoard
  onChange: (board: MarkExamBoard) => void
  disabled?: boolean
}

export function MarkBoardPicker({ value, onChange, disabled }: Props) {
  const selected = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0]

  // The chips carry the board name only; the hint for whichever board is
  // selected sits once under the row, so six chips stay one line tall instead
  // of each stretching to the longest hint. Under 600px the chips give way to a
  // native select (CSS swaps them), which is why both controls are rendered.
  return (
    <fieldset className="ms-mark-board-picker" disabled={disabled}>
      <legend className="label-overline mb-2.5 block">Exam board</legend>
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
            </label>
          )
        })}
      </div>
      <select
        id="mark-board-select"
        aria-label="Exam board"
        aria-describedby="mark-board-caption"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as MarkExamBoard)}
        className="ms-mark-board-select ec-input select-chevron appearance-none"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <p id="mark-board-caption" className="ms-mark-board-caption">
        {selected?.hint}
      </p>
    </fieldset>
  )
}

/** Display name for a mark board — used by the phone setup summary chip. */
export function markBoardLabel(board: MarkExamBoard): string {
  return OPTIONS.find((o) => o.id === board)?.label ?? board
}

export function markBoardFromProfileBoard(board: string | null | undefined): MarkExamBoard {
  const sys = board ? getExamSystemByProfileBoardId(board) : null
  if (sys?.markingEnabled) return sys.id
  if (board === 'IB') return 'ib'
  if (board === 'Edexcel') return 'edexcel'
  if (board === 'OxfordAQA') return 'oxfordaqa'
  if (board === 'AQA') return 'aqa'
  if (board === 'AP') return 'ap'
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

export function isUrlMarkBoard(value: string | null | undefined): value is MarkExamBoard {
  if (!value) return false
  return listMarkingExamSystems().some((s) => s.id === value)
}

/** Map resolveBoard() / URL board onto a live mark picker board (never invent IDs). */
export function coerceMarkExamBoard(board: string | null | undefined): MarkExamBoard {
  if (isUrlMarkBoard(board)) return board
  return 'cambridge'
}
