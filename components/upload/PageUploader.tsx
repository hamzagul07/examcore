'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, Plus, Camera } from 'lucide-react'
import {
  UploadPageCard,
  type UploadPage,
  type PageUploadStatus,
} from './UploadPageCard'

export type { UploadPage, PageUploadStatus }

function newPageId() {
  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function fileToUploadPage(file: File): UploadPage {
  return {
    id: newPageId(),
    file,
    previewUrl: URL.createObjectURL(file),
    detectedQuestion: null,
    manualQuestion: null,
    status: 'queued',
  }
}

export type PageUploaderProps = {
  pages: UploadPage[]
  onPagesChange: (pages: UploadPage[]) => void
  /** Show per-page question assignment (whole-paper mode) */
  showQuestionAssign?: boolean
  questionOptions?: string[]
  /** Allow PDF upload (whole-paper only) */
  allowPdf?: boolean
  pdfFile?: File | null
  onPdfChange?: (file: File | null) => void
  disabled?: boolean
  emptyLabel?: string
  emptyHint?: string
}

export function PageUploader({
  pages,
  onPagesChange,
  showQuestionAssign = false,
  questionOptions = [],
  allowPdf = false,
  pdfFile = null,
  onPdfChange,
  disabled,
  emptyLabel = 'Drop pages here or click to upload',
  emptyHint = 'Multiple JPEG, PNG, or WebP images',
}: PageUploaderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const retakeTargetRef = useRef<string | null>(null)

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files)
      const pdf = list.find((f) => f.type === 'application/pdf')
      if (allowPdf && pdf && list.length === 1 && onPdfChange) {
        onPdfChange(pdf)
        onPagesChange([])
        return
      }
      const images = list.filter((f) => f.type.startsWith('image/'))
      if (images.length) {
        onPdfChange?.(null)
        onPagesChange([...pages, ...images.map(fileToUploadPage)])
      }
    },
    [allowPdf, onPdfChange, onPagesChange, pages]
  )

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...pages]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onPagesChange(next)
  }

  const handleCameraCapture = (file: File) => {
    const targetId = retakeTargetRef.current
    retakeTargetRef.current = null
    if (targetId) {
      onPagesChange(
        pages.map((p) =>
          p.id === targetId
            ? {
                ...fileToUploadPage(file),
                id: p.id,
                manualQuestion: p.manualQuestion,
                detectedQuestion: p.detectedQuestion,
              }
            : p
        )
      )
    } else {
      onPdfChange?.(null)
      onPagesChange([...pages, fileToUploadPage(file)])
    }
  }

  const hasContent = pages.length > 0 || !!pdfFile

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div
          className={`pointer-events-none absolute -inset-0.5 rounded-[28px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500 blur transition-opacity duration-300 ${
            hasContent ? 'opacity-60' : 'opacity-25 group-hover:opacity-50'
          }`}
        />
        <div
          className="relative ec-card border-2 border-dashed border-white/15 p-8 text-center transition-all duration-300 hover:-translate-y-1 sm:p-10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
          }}
        >
          <div
            className="relative mx-auto mb-5 flex items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_32px_rgba(16,185,129,0.4)]"
            style={{ width: 72, height: 72 }}
          >
            <UploadCloud className="h-9 w-9 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white">{emptyLabel}</p>
          <p className="mt-2 font-mono text-xs text-slate-500">{emptyHint}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="ec-btn-secondary justify-center text-sm"
            >
              <UploadCloud className="h-4 w-4" />
              Choose files
            </button>
            {allowPdf && onPdfChange && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => pdfInputRef.current?.click()}
                className="ec-btn-secondary justify-center text-sm"
              >
                Upload PDF
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                retakeTargetRef.current = null
                cameraInputRef.current?.click()
              }}
              className="ec-btn-secondary justify-center text-sm"
            >
              <Camera className="h-4 w-4" />
              Take a photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {allowPdf && onPdfChange && (
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  onPdfChange(f)
                  onPagesChange([])
                }
                e.target.value = ''
              }}
            />
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleCameraCapture(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {pdfFile && (
        <div className="ec-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-white">{pdfFile.name}</p>
            <p className="font-mono text-xs text-slate-500">
              PDF · {(pdfFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPdfChange?.(null)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-3">
          <p className="ec-label-tech">YOUR PAGES — DRAG TO REORDER</p>
          {pages.map((page, index) => (
            <UploadPageCard
              key={page.id}
              page={page}
              index={index}
              showQuestionAssign={showQuestionAssign}
              questionOptions={questionOptions}
              onRemove={() =>
                onPagesChange(pages.filter((p) => p.id !== page.id))
              }
              onQuestionChange={(q) =>
                onPagesChange(
                  pages.map((p) =>
                    p.id === page.id ? { ...p, manualQuestion: q } : p
                  )
                )
              }
              onRetake={() => {
                retakeTargetRef.current = page.id
                cameraInputRef.current?.click()
              }}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) reorder(dragIndex, index)
                setDragIndex(null)
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="ec-btn-secondary w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add another page
      </button>
    </div>
  )
}
