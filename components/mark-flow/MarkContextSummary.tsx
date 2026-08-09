'use client'

import { getExamSystem, isExamSystemId } from '@/lib/exam-systems'

type Props = {
  board: string
  subjectLabel: string | null
  scopeLabel: string
  onEdit: () => void
}

/** Compact board/subject slip with edit affordance. */
export function MarkContextSummary({
  board,
  subjectLabel,
  scopeLabel,
  onEdit,
}: Props) {
  const boardLabel = isExamSystemId(board)
    ? getExamSystem(board).label
    : board

  return (
    <div className="ms-mark-flow-context-slip ec-card ec-card--paper mt-5 flex flex-wrap items-center justify-between gap-3 border border-[var(--ec-border)] px-4 py-3">
      <div className="min-w-0">
        <p className="ms-micro">CONTEXT</p>
        <p className="mt-1 truncate font-mono text-sm text-[var(--ec-text-primary)]">
          {boardLabel}
          {subjectLabel ? ` · ${subjectLabel}` : ''}
          {` · ${scopeLabel}`}
        </p>
      </div>
      <button
        type="button"
        className="ec-btn-secondary min-h-[44px] shrink-0 px-3 text-sm"
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  )
}
