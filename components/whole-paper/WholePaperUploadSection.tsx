'use client'

import { useMemo, useState } from 'react'
import {
  PageUploader,
  fileToUploadPage,
  type UploadPage,
} from '@/components/upload/PageUploader'
import {
  estimateMarkingSeconds,
  formatEstimatedTime,
} from '@/lib/marking/whole-paper'

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

  const canSubmit = !!(pdfFile || pages.length > 0)

  if (showConfirm) {
    return (
      <div className="ec-card space-y-5 p-6 sm:p-8">
        <p className="ec-label-tech">READY TO MARK</p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <strong className="text-white">{pdfFile ? 1 : pages.length}</strong>{' '}
            {pdfFile ? 'PDF' : 'pages'} uploaded
          </li>
          <li>
            <strong className="text-white">{questionCount}</strong> question
            {questionCount !== 1 ? 's' : ''} detected across{' '}
            {pdfFile ? 'PDF pages' : `${pages.length} pages`}
          </li>
          <li>
            Estimated marking time:{' '}
            <strong className="text-emerald-300">
              {formatEstimatedTime(estSeconds)}
            </strong>
          </li>
        </ul>
        <p className="text-xs leading-relaxed text-slate-500">
          If you only completed some questions, we&apos;ll show two scores:
          what you earned on attempted questions, and your score if the rest
          were left blank.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
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
            className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          disabled={disabled}
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
