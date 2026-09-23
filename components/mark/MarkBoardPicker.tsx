'use client'

import { useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { resolveBoard } from '@/lib/courses/board'
import {
  getExamSystem,
  getExamSystemByProfileBoardId,
  listMarkingExamSystems,
  type ExamSystemId,
} from '@/lib/exam-systems'
import type { MarkBoardLock } from '@/lib/marking/mark-board-lock'
import { releaseMarkBoardBoot } from '@/lib/marking/mark-board-hint'

/** Boards that currently accept marks on /mark (driven by adapter.markingEnabled). */
export type MarkExamBoard = ExamSystemId

const OPTIONS = listMarkingExamSystems().map((sys) => ({
  id: sys.id as MarkExamBoard,
  label: sys.label,
  hint: sys.markPickerHint,
}))

/** Where a signed-in student changes the board that /mark locks to — and comes straight back. */
export const CHANGE_BOARD_HREF = '/account/exam?next=/mark'

type Props = {
  value: MarkExamBoard
  onChange: (board: MarkExamBoard) => void
  disabled?: boolean
  /**
   * Signed-in students mark on their profile board: one line and a "Change"
   * link instead of the grid. See lib/marking/mark-board-lock.ts.
   */
  lock?: MarkBoardLock | null
}

export function MarkBoardPicker({ value, onChange, disabled, lock }: Props) {
  if (lock?.mode === 'locked') {
    return (
      <LockedBoard value={value} lock={lock} onChange={onChange} disabled={disabled} />
    )
  }

  return <BoardGrid value={value} onChange={onChange} disabled={disabled} />
}

function BoardGrid({ value, onChange, disabled }: Omit<Props, 'lock'>) {
  // Backstop for the boot attribute: once the profile has loaded and the grid
  // is what is being shown, nothing may keep it hidden — not a cached board the
  // registry no longer locks, not a profile fetch that threw.
  useEffect(() => {
    if (!disabled) releaseMarkBoardBoot()
  }, [disabled])

  const labels = OPTIONS.map((o) => o.label)
  const labelText =
    labels.length <= 1
      ? labels[0] ?? 'your board'
      : labels.length === 2
        ? `${labels[0]} and ${labels[1]}`
        : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`

  return (
    <fieldset className="ms-mark-board-picker ms-mark-board-picker--grid" disabled={disabled}>
      <legend className="label-overline mb-2.5 block">Exam board</legend>
      <p className="ms-mark-board-hint mb-3 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Pick your board — {labelText} support photos, PDFs, and scanned worksheets.
      </p>
      {/* Shown only while <html data-ms-board-lock> is set: the boot script
          found a cached profile board, so the grid stays hidden until React
          swaps in the locked line — no six-board flash for a signed-in student. */}
      <div className="ms-mark-board-boot" aria-hidden="true">
        <span className="ms-mark-board-boot-bar" />
      </div>
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

function LockedBoard({
  value,
  lock,
  onChange,
  disabled,
}: {
  value: MarkExamBoard
  lock: Extract<MarkBoardLock, { mode: 'locked' }>
  onChange: (board: MarkExamBoard) => void
  disabled?: boolean
}) {
  // The line describes what THIS picker's value is, not the host's idea of
  // it: in MarkFlow v2 the picker edits a draft that only reaches the host on
  // submit, so "Back to Cambridge" must flip the line the moment it is
  // pressed, not after the mark is sent.
  const active = getExamSystem(value)
  const profile = getExamSystem(lock.profileBoard)
  const overridden = value !== lock.profileBoard
  const labelId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  // "Back to X" unmounts the button it was pressed on; keyboard focus would
  // fall to <body>. Land it on the link that takes its place instead.
  const wasOverridden = useRef(overridden)
  useEffect(() => {
    if (wasOverridden.current && !overridden) {
      rowRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    }
    wasOverridden.current = overridden
  }, [overridden])

  return (
    <div
      className="ms-mark-board-picker ms-mark-board-picker--locked"
      role="group"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="label-overline mb-2.5 block">
        Exam board
      </p>
      <div className="ms-mark-board-locked" ref={rowRef}>
        <div className="ms-mark-board-locked-main">
          <span className="ms-mark-board-option-label">{active.label}</span>
          <span className="ms-mark-board-option-hint">
            {overridden
              ? `Opened from a link — your board is ${profile.label}.`
              : active.markPickerHint}
          </span>
        </div>
        {overridden ? (
          <button
            type="button"
            className="ms-mark-board-locked-action"
            disabled={disabled}
            onClick={() => onChange(lock.profileBoard)}
          >
            Back to {profile.label}
          </button>
        ) : (
          <Link href={CHANGE_BOARD_HREF} className="ms-mark-board-locked-action">
            Change board
          </Link>
        )}
      </div>
    </div>
  )
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
