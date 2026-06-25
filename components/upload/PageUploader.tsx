'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { UploadCloud, Plus, Camera } from 'lucide-react'
import { compressImage } from '@/lib/upload/compress-image'
import { formatFileSize, getPdfSizeError } from '@/lib/upload/upload-limits'
import {
  UploadPageCard,
  type UploadPage,
  type PageUploadStatus,
} from './UploadPageCard'

export type { UploadPage, PageUploadStatus }

function newPageId() {
  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function fileToUploadPage(
  file: File,
  status: PageUploadStatus = 'queued'
): UploadPage {
  return {
    id: newPageId(),
    file,
    previewUrl: URL.createObjectURL(file),
    detectedQuestion: null,
    manualQuestion: null,
    status,
    fileSizeBytes: file.size,
  }
}

export type PageUploaderProps = {
  pages: UploadPage[]
  onPagesChange: Dispatch<SetStateAction<UploadPage[]>>
  showQuestionAssign?: boolean
  questionOptions?: string[]
  allowPdf?: boolean
  pdfFile?: File | null
  onPdfChange?: (file: File | null) => void
  onPdfError?: (message: string | null) => void
  disabled?: boolean
  emptyLabel?: string
  emptyHint?: string
}

async function compressPageInPlace(
  pageId: string,
  sourceFile: File,
  onPagesChange: Dispatch<SetStateAction<UploadPage[]>>
) {
  const compressed = await compressImage(sourceFile)
  const needsNewPreview = compressed !== sourceFile
  onPagesChange((prev) =>
    prev.map((p) => {
      if (p.id !== pageId) return p
      if (needsNewPreview) {
        URL.revokeObjectURL(p.previewUrl)
      }
      return {
        ...p,
        file: compressed,
        previewUrl: needsNewPreview
          ? URL.createObjectURL(compressed)
          : p.previewUrl,
        status: 'queued' as const,
        fileSizeBytes: compressed.size,
        originalSizeBytes:
          sourceFile.size > compressed.size ? sourceFile.size : undefined,
      }
    })
  )
}

export function PageUploader({
  pages,
  onPagesChange,
  showQuestionAssign = false,
  questionOptions = [],
  allowPdf = false,
  pdfFile = null,
  onPdfChange,
  onPdfError,
  disabled,
  emptyLabel = 'Drop pages here or click to upload',
  emptyHint = 'Multiple JPEG, PNG, or WebP images',
}: PageUploaderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const retakeTargetRef = useRef<string | null>(null)

  const isCompressing = pages.some((p) => p.status === 'compressing')
  const controlsDisabled = disabled || isCompressing

  const setPdf = useCallback(
    (file: File | null) => {
      if (!file) {
        setPdfError(null)
        onPdfError?.(null)
        onPdfChange?.(null)
        return
      }
      const err = getPdfSizeError(file)
      setPdfError(err)
      onPdfError?.(err)
      if (err) {
        onPdfChange?.(null)
        return
      }
      onPdfChange?.(file)
    },
    [onPdfChange, onPdfError]
  )

  const ingestImages = useCallback(
    (images: File[]) => {
      if (!images.length) return
      onPdfChange?.(null)
      setPdfError(null)
      onPdfError?.(null)

      const placeholders = images.map((file) => ({
        ...fileToUploadPage(file, 'compressing'),
        originalSizeBytes: file.size,
      }))
      onPagesChange((prev) => [...prev, ...placeholders])

      for (let i = 0; i < placeholders.length; i++) {
        void compressPageInPlace(
          placeholders[i].id,
          images[i],
          onPagesChange
        )
      }
    },
    [onPdfChange, onPdfError, onPagesChange]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files)
      const pdf = list.find(
        (f) =>
          f.type === 'application/pdf' ||
          f.name.toLowerCase().endsWith('.pdf')
      )
      if (allowPdf && pdf && list.length === 1 && onPdfChange) {
        setPdf(pdf)
        onPagesChange(() => [])
        return
      }
      const images = list.filter((f) => f.type.startsWith('image/'))
      if (images.length) ingestImages(images)
    },
    [allowPdf, onPdfChange, ingestImages, onPagesChange, setPdf]
  )

  const reorder = (from: number, to: number) => {
    if (from === to) return
    onPagesChange((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleCameraCapture = (file: File) => {
    const targetId = retakeTargetRef.current
    retakeTargetRef.current = null

    if (targetId) {
      onPagesChange((prev) =>
        prev.map((p) => {
          if (p.id !== targetId) return p
          URL.revokeObjectURL(p.previewUrl)
          return {
            ...p,
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'compressing' as const,
            originalSizeBytes: file.size,
            fileSizeBytes: undefined,
          }
        })
      )
      void compressPageInPlace(targetId, file, onPagesChange)
    } else {
      ingestImages([file])
    }
  }

  const hasContent = pages.length > 0 || !!pdfFile
  const selectedPage =
    pages.find((p) => p.id === selectedPageId) ?? pages[pages.length - 1] ?? null

  useEffect(() => {
    if (pages.length === 0) {
      setSelectedPageId(null)
      return
    }
    if (!selectedPageId || !pages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(pages[pages.length - 1].id)
    }
  }, [pages, selectedPageId])

  return (
    <div className="space-y-4">
      {isCompressing && (
        <p className="rounded-xl border ec-tint-info-chip px-4 py-2 text-center text-sm" role="status">
          Preparing images…
        </p>
      )}

      <div className="relative group">
        <div
          className={`pointer-events-none absolute -inset-0.5 rounded-[28px] ec-upload-glow-ring blur transition-opacity duration-300 ${
            hasContent ? 'opacity-60' : 'opacity-25 group-hover:opacity-50'
          }`}
        />
        <div
          role="region"
          aria-label="Upload answer pages"
          aria-describedby={!hasContent ? 'upload-hint' : undefined}
          className={`relative ec-card border-2 border-dashed text-center transition-all duration-300 hover:-translate-y-1 ${
            hasContent ? 'p-5 sm:p-6' : 'p-8 sm:p-10'
          }`}
          style={{ borderColor: 'var(--ec-border)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
          }}
        >
          {!hasContent && (
            <div
              className="ec-upload-icon-wrap relative mx-auto mb-5 flex items-center justify-center rounded-2xl"
              style={{ width: 72, height: 72 }}
            >
              <UploadCloud className="h-9 w-9 ec-text-brand" />
            </div>
          )}
          <p className={`font-bold text-[var(--ec-text-primary)] ${hasContent ? 'text-base' : 'text-lg'}`}>
            {hasContent ? 'Add another page' : emptyLabel}
          </p>
          {!hasContent && (
            <p id="upload-hint" className="mt-2 font-mono text-xs text-[var(--ec-text-secondary)]">{emptyHint}</p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => fileInputRef.current?.click()}
              className="ec-btn-secondary justify-center text-sm"
            >
              <UploadCloud className="h-4 w-4" />
              Choose files
            </button>
            {allowPdf && onPdfChange && (
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => pdfInputRef.current?.click()}
                className="ec-btn-secondary justify-center text-sm"
              >
                Upload PDF
              </button>
            )}
            <button
              type="button"
              disabled={controlsDisabled}
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
                  setPdf(f)
                  onPagesChange(() => [])
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

      {pdfError && (
        <p className="rounded-xl border ec-tint-critical-chip px-4 py-3 text-sm">
          {pdfError}
        </p>
      )}

      {pdfFile && !pdfError && (
        <div className="ec-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-[var(--ec-text-primary)]">{pdfFile.name}</p>
            <p className="font-mono text-xs text-[var(--ec-text-secondary)]">
              PDF · {formatFileSize(pdfFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPdf(null)}
            className="text-sm ec-score-low hover:opacity-80"
          >
            Remove
          </button>
        </div>
      )}

      {pages.length > 0 && selectedPage && (
        <div>
          <div className="ms-upload-preview-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPage.previewUrl}
              alt={`Preview page ${pages.findIndex((p) => p.id === selectedPage.id) + 1}`}
              className="ms-upload-preview"
            />
          </div>
          {pages.length > 1 && (
            <div className="ms-upload-thumbs" role="tablist" aria-label="Uploaded pages">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  role="tab"
                  aria-selected={page.id === selectedPage.id}
                  aria-label={`Page ${index + 1}`}
                  className={`ms-upload-thumb${page.id === selectedPage.id ? ' on' : ''}`}
                  onClick={() => setSelectedPageId(page.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.previewUrl} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-3">
          <p className="ec-label-tech">YOUR PAGES — REORDER</p>
          {pages.map((page, index) => (
            <UploadPageCard
              key={page.id}
              page={page}
              index={index}
              total={pages.length}
              showQuestionAssign={showQuestionAssign}
              questionOptions={questionOptions}
              onRemove={() => {
                onPagesChange((prev) => prev.filter((p) => p.id !== page.id))
              }}
              onQuestionChange={(q) =>
                onPagesChange((prev) =>
                  prev.map((p) =>
                    p.id === page.id ? { ...p, manualQuestion: q } : p
                  )
                )
              }
              onRetake={() => {
                retakeTargetRef.current = page.id
                cameraInputRef.current?.click()
              }}
              onMoveUp={() => reorder(index, index - 1)}
              onMoveDown={() => reorder(index, index + 1)}
              onSelect={() => setSelectedPageId(page.id)}
              selected={page.id === selectedPage?.id}
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
        disabled={controlsDisabled}
        onClick={() => fileInputRef.current?.click()}
        className="ec-btn-secondary w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add another page
      </button>
    </div>
  )
}
