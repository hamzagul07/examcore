'use client'

import { GripVertical, X, RotateCcw, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { formatQuestionLabel } from '@/lib/marking/page-detection'
import { formatFileSize } from '@/lib/upload/upload-limits'

export type PageUploadStatus =
  | 'compressing'
  | 'queued'
  | 'processing'
  | 'done'
  | 'failed'

export type UploadPage = {
  id: string
  file: File
  previewUrl: string
  detectedQuestion: string | null
  manualQuestion: string | null
  status: PageUploadStatus
  /** Size shown in UI (compressed when ready) */
  fileSizeBytes?: number
  /** Original size before compression, if compressed */
  originalSizeBytes?: number
}

export function UploadPageCard({
  page,
  index,
  total,
  showQuestionAssign,
  questionOptions,
  onRemove,
  onQuestionChange,
  onRetake,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  page: UploadPage
  index: number
  total: number
  showQuestionAssign?: boolean
  questionOptions: string[]
  onRemove: () => void
  onQuestionChange: (q: string | null) => void
  onRetake: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}) {
  const label = showQuestionAssign
    ? formatQuestionLabel(page.manualQuestion ?? page.detectedQuestion)
    : `Page ${index + 1}`

  const statusStyles: Record<PageUploadStatus, string> = {
    compressing: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
    queued: 'border-white/15 bg-white/5 text-slate-400',
    processing: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    failed: 'border-red-500/40 bg-red-500/10 text-red-300',
  }

  const statusLabel =
    page.status === 'compressing' ? 'optimizing' : page.status

  const sizeLabel =
    page.fileSizeBytes != null
      ? page.originalSizeBytes != null &&
        page.originalSizeBytes > page.fileSizeBytes
        ? `${formatFileSize(page.fileSizeBytes)} (was ${formatFileSize(page.originalSizeBytes)})`
        : formatFileSize(page.fileSizeBytes)
      : null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="ec-card flex gap-3 p-3 sm:p-4"
    >
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          className="hidden min-h-[44px] min-w-[44px] cursor-grab touch-none items-center justify-center text-slate-500 hover:text-slate-300 active:cursor-grabbing sm:flex"
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 disabled:opacity-30 sm:hidden"
            aria-label="Move page up"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index >= total - 1}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 disabled:opacity-30 sm:hidden"
            aria-label="Move page down"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-24 sm:w-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.previewUrl}
          alt={`Page ${index + 1}`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-500">Page {index + 1}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusStyles[page.status]}`}
          >
            {page.status === 'compressing' && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            )}
            {statusLabel}
          </span>
        </div>

        <p className="mt-1 text-sm font-semibold text-white">{label}</p>
        {page.status === 'compressing' && (
          <p className="mt-1 text-xs text-cyan-300/90">Optimizing image…</p>
        )}
        {sizeLabel && page.status !== 'compressing' && (
          <p className="mt-1 font-mono text-[10px] text-slate-500">{sizeLabel}</p>
        )}

        {showQuestionAssign && (
          <>
            <label className="label-overline mt-2 mb-1 block text-[10px]">
              This page is part of
            </label>
            <select
              value={page.manualQuestion ?? page.detectedQuestion ?? ''}
              onChange={(e) =>
                onQuestionChange(e.target.value === '' ? null : e.target.value)
              }
              className="ec-input select-chevron min-h-[44px] w-full appearance-none py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {questionOptions.map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
              {page.detectedQuestion &&
                !questionOptions.includes(page.detectedQuestion) && (
                  <option value={page.detectedQuestion}>
                    Q{page.detectedQuestion} (detected)
                  </option>
                )}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={onRetake}
          className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retake
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
        aria-label="Remove page"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
