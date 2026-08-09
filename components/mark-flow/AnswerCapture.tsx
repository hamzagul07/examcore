'use client'

import { useRef, useState } from 'react'
import {
  PageUploader,
  type UploadPage,
} from '@/components/upload/PageUploader'
import { useCoarsePointer } from '@/lib/hooks/useCoarsePointer'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { MarkInputKind } from './types'

type Props = {
  pages: UploadPage[]
  onPagesChange: (pages: UploadPage[] | ((prev: UploadPage[]) => UploadPage[])) => void
  typedAnswer: string
  onTypedAnswerChange: (text: string) => void
  inputKind: MarkInputKind | null
  onInputKindChange: (kind: MarkInputKind) => void
  allowPdf?: boolean
  pdfFile?: File | null
  onPdfChange?: (file: File | null) => void
  disabled?: boolean
}

/**
 * Input-first answer capture (R1 Capture screen).
 * Camera-primary on coarse pointers; typed path is a peer mode, not buried.
 */
export function AnswerCapture({
  pages,
  onPagesChange,
  typedAnswer,
  onTypedAnswerChange,
  inputKind,
  onInputKindChange,
  allowPdf = true,
  pdfFile = null,
  onPdfChange,
  disabled,
}: Props) {
  const touch = useCoarsePointer()
  const typeRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'photos' | 'typed'>(
    inputKind === 'typed' ? 'typed' : 'photos'
  )

  function selectMode(next: 'photos' | 'typed') {
    setMode(next)
    if (next === 'typed') {
      onInputKindChange('typed')
      queueMicrotask(() => typeRef.current?.focus())
    } else {
      onInputKindChange(pages.length || pdfFile ? (pdfFile ? 'pdf' : 'photos') : 'photos')
    }
  }

  return (
    <div className="ms-mark-flow-capture">
      <SegmentedControl
        className="ms-mark-flow-input-mode mb-4 flex flex-wrap gap-2"
        optionClassName="ec-pill"
        aria-label="How are you providing your answer"
        value={mode}
        onChange={selectMode}
        disabled={disabled}
        options={[
          { value: 'photos', label: touch ? 'Photos' : 'Photos / PDF' },
          { value: 'typed', label: 'Type it' },
        ]}
      />

      {mode === 'typed' ? (
        <div>
          <label htmlFor="mark-flow-typed" className="label-overline mb-2 inline-block">
            Your working
          </label>
          <textarea
            ref={typeRef}
            id="mark-flow-typed"
            className="ec-input min-h-[200px] font-mono text-sm leading-relaxed"
            placeholder="Type the working you want marked…"
            value={typedAnswer}
            disabled={disabled}
            onChange={(e) => {
              onTypedAnswerChange(e.target.value)
              onInputKindChange('typed')
            }}
          />
        </div>
      ) : (
        <PageUploader
          pages={pages}
          onPagesChange={onPagesChange}
          allowPdf={allowPdf}
          pdfFile={pdfFile}
          onPdfChange={(f) => {
            onPdfChange?.(f)
            if (f) onInputKindChange('pdf')
          }}
          disabled={disabled}
          emptyLabel={
            touch ? 'Take photos of your working' : 'Drop files here, or choose files'
          }
          emptyHint={
            touch
              ? 'Camera, gallery photos, or a PDF scan'
              : 'JPEG, PNG, WebP, or PDF'
          }
        />
      )}
    </div>
  )
}
