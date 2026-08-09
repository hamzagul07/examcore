'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PageUploader,
  fileToUploadPage,
  type UploadPage,
} from '@/components/upload/PageUploader'
import { MarkUsageIndicator } from '@/components/billing/MarkUsageIndicator'
import {
  estimateMarkingSeconds,
  formatEstimatedTime,
} from '@/lib/marking/whole-paper'
import { hasCompressingPages } from '@/lib/upload/prepare-upload'

export type WholePaperPage = UploadPage

export type WholePaperUploadSectionProps = {
  questionOptions: string[]
  /**
   * Questions listed for this past paper in the catalog — structure only,
   * not what OCR found in the upload (MK-03).
   */
  catalogQuestionCount?: number
  onCancel: () => void
  onSubmit: (pages: UploadPage[], pdfFile: File | null) => void
  /** True while pages/PDF are held in memory and would be lost on refresh. */
  onUnsavedChange?: (dirty: boolean) => void
  disabled?: boolean
}

export function WholePaperUploadSection({
  questionOptions,
  catalogQuestionCount = 0,
  onCancel,
  onSubmit,
  onUnsavedChange,
  disabled,
}: WholePaperUploadSectionProps) {
  const [pages, setPages] = useState<UploadPage[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const dirty = pages.length > 0 || !!pdfFile

  useEffect(() => {
    onUnsavedChange?.(dirty)
    return () => onUnsavedChange?.(false)
  }, [dirty, onUnsavedChange])

  // Only count questions the student (or a prior detector) assigned to pages —
  // never the catalog length pretending to be OCR (MK-03).
  const labelledQuestionCount = useMemo(() => {
    const nums = new Set<string>()
    for (const p of pages) {
      const q = p.manualQuestion ?? p.detectedQuestion
      if (q) nums.add(q)
    }
    return nums.size
  }, [pages])

  // Time estimate from what we actually know: labelled Qs, else page/PDF volume.
  const estimateUnits = Math.max(
    labelledQuestionCount,
    pdfFile ? Math.max(catalogQuestionCount, 1) : pages.length || 1
  )
  const estSeconds = estimateMarkingSeconds(estimateUnits)

  const isCompressing = hasCompressingPages(pages)
  const canSubmit = dirty && !isCompressing
  const uploadLabel = pdfFile
    ? '1 PDF uploaded'
    : `${pages.length} page${pages.length !== 1 ? 's' : ''} uploaded`

  if (showConfirm) {
    return (
      <div className="ec-card ec-card--paper space-y-5 p-6 sm:p-8">
        <p className="ec-label-tech">READY TO MARK</p>
        <ul className="space-y-2 text-sm text-[var(--ec-text-secondary)]">
          <li>
            <strong className="text-[var(--ec-text-primary)]">
              {pdfFile ? 1 : pages.length}
            </strong>{' '}
            {pdfFile ? 'PDF' : pages.length === 1 ? 'page' : 'pages'} selected
          </li>
          {labelledQuestionCount > 0 ? (
            <li>
              <strong className="text-[var(--ec-text-primary)]">
                {labelledQuestionCount}
              </strong>{' '}
              question{labelledQuestionCount !== 1 ? 's' : ''} labelled on your
              pages
            </li>
          ) : catalogQuestionCount > 0 ? (
            <li>
              This paper&apos;s structure lists up to{' '}
              <strong className="text-[var(--ec-text-primary)]">
                {catalogQuestionCount}
              </strong>{' '}
              questions — we&apos;ll count what you wrote after reading the
              upload
            </li>
          ) : (
            <li>We&apos;ll find the questions in your upload after reading it</li>
          )}
          <li>
            Estimated marking time:{' '}
            <strong className="ec-score-high">
              {formatEstimatedTime(estSeconds)}
            </strong>
            {labelledQuestionCount === 0 ? (
              <span className="text-[var(--ec-text-secondary)]">
                {' '}
                (based on {pdfFile ? 'paper size' : uploadLabel.toLowerCase()}, not
                a final question count)
              </span>
            ) : null}
          </li>
        </ul>
        <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
          If you only completed some questions, we&apos;ll show two scores: what
          you earned on attempted questions, and your score if the rest were left
          blank.
        </p>
        <MarkUsageIndicator
          variant="whole_paper"
          className="border-t border-[var(--ec-border)] pt-4"
        />
        {disabled && (
          <p className="text-sm ec-score-low">
            Monthly cap reached — upgrade or top up credits to mark this paper.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={disabled || isCompressing}
            onClick={() => onSubmit(pages, pdfFile)}
            className="ec-btn-primary flex-1 justify-center"
          >
            Mark this paper
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="ec-btn-secondary flex-1 justify-center"
          >
            Add more pages
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ec-card ec-card--paper min-h-[44px] px-4 py-3 text-sm font-medium text-[var(--ec-text-secondary)] transition hover:text-[var(--ec-text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ms-whole-paper-upload space-y-6">
      <PageUploader
        pages={pages}
        onPagesChange={setPages}
        showQuestionAssign
        questionOptions={questionOptions}
        allowPdf
        pdfFile={pdfFile}
        onPdfChange={setPdfFile}
        disabled={disabled}
        emptyLabel="Drop files here, or choose files"
        emptyHint="Multiple JPEG, PNG, WebP images, or one PDF scan"
      />

      {canSubmit && (
        <button
          type="button"
          disabled={disabled || isCompressing}
          onClick={() => setShowConfirm(true)}
          className="ec-btn-primary w-full justify-center text-base brand-pulse"
          style={{ padding: '18px 32px' }}
        >
          Review &amp; mark paper
        </button>
      )}
    </div>
  )
}

export { fileToUploadPage }
