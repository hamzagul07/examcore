'use client'

import type { MarkExamBoard } from '@/components/mark/MarkBoardPicker'

const BOARD_LABEL: Record<MarkExamBoard, string> = {
  cambridge: 'Cambridge',
  ib: 'IB Diploma',
  edexcel: 'Edexcel IAL',
}

type Props = {
  board: MarkExamBoard
  subjectLabel: string | null
  scopeLabel: string
  onEdit: () => void
}

/** Compact editable context under the capture action (R1). */
export function MarkContextSummary({
  board,
  subjectLabel,
  scopeLabel,
  onEdit,
}: Props) {
  return (
    <div className="ms-mark-flow-context mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--ec-border)] pt-4">
      <div className="min-w-0">
        <p className="ms-micro mb-1">CONTEXT</p>
        <p className="text-sm text-[var(--ec-text-primary)]">
          <span className="font-semibold">{BOARD_LABEL[board] ?? board}</span>
          {subjectLabel ? (
            <>
              <span className="text-[var(--ec-text-secondary)]"> · </span>
              {subjectLabel}
            </>
          ) : null}
          <span className="text-[var(--ec-text-secondary)]"> · </span>
          {scopeLabel}
        </p>
      </div>
      <button
        type="button"
        className="inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
        onClick={onEdit}
      >
        Edit -&gt;
      </button>
    </div>
  )
}
