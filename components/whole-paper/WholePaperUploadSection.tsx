'use client'

import { useMemo, useState } from 'react'
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
  detectedQuestionCount: number
  onCancel: () => void
  onSubmit: (pages: UploadPage[], pdfFile: File | null) => void
  disabled?: boolean
}

export function WholePaperUploadSection({
  questionOptions,
  detectedQuestionCount,
  onCancel,
  onSubmit,
  disabled,
}: WholePaperUploadSectionProps) {
  const [pages, setPages] = useState<UploadPage[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const questionCount = useMemo(() => {
    const nums = new Set<string>()
    for (const p of pages) {
      const q = p.manualQuestion ?? p.detectedQuestion
      if (q) nums.add(q)
    }
    return Math.max(nums.size, detectedQuestionCount, pdfFile ? 1 : 0)
  }, [pages, detectedQuestionCount, pdfFile])

  const estSeconds = estimateMarkingSeconds(
    Math.max(questionCount, pages.length || 1)
  )

  const isCompressing = hasCompressingPages(pages)
  const canSubmit = !!(pdfFile || pages.length > 0) && !isCompressing

  if (showConfirm) {
    return (
      <div className="ec-card space-y-5 p-6 sm:p-8">
        <p className="ec-label-tech">READY TO MARK</p>
        <ul className="space-y-2 text-sm text-[var(--ec-text-secondary)]">
          <li>
            <strong className="text-[var(--ec-text-primary)]">{pdfFile ? 1 : pages.length}</strong>{' '}
            {pdfFile ? 'PDF' : 'pages'} uploaded
          </li>
          <li>
            <strong className="text-[var(--ec-text-primary)]">{questionCount}</strong> question
            {questionCount !== 1 ? 's' : ''} detected across{' '}
            {pdfFile ? 'PDF pages' : `${pages.length} pages`}
          </li>
          <li>
            Estimated marking time:{' '}
            <strong className="ec-score-high">
              {formatEstimatedTime(estSeconds)}
            </strong>
          </li>
        </ul>
        <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
          If you only completed some questions, we&apos;ll show two scores:
          what you earned on attempted questions, and your score if the rest
          were left blank.
        </p>
        <MarkUsageIndicator variant="whole_paper" className="border-t border-[var(--ec-border)] pt-4" />
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
            className="min-h-[44px] rounded-xl px-4 py-3 text-sm font-medium text-[var(--ec-text-secondary)] transition hover:text-[var(--ec-text-primary)]"
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
        emptyLabel="Drop pages here or click to upload"
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
