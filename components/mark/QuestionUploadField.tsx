'use client'

import { useCallback, useRef, useState } from 'react'
import { compressImage } from '@/lib/upload/compress-image'
import { formatFileSize, getPdfSizeError } from '@/lib/upload/upload-limits'
import { useCoarsePointer } from '@/lib/hooks/useCoarsePointer'

type Props = {
  id: string
  label: string
  hint?: string
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  compressing?: boolean
  onCompressingChange?: (v: boolean) => void
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function QuestionUploadField({
  id,
  label,
  hint = 'JPEG, PNG, WebP, or PDF — drop files here, or choose files',
  file,
  onChange,
  disabled = false,
  compressing = false,
  onCompressingChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const touchPrimary = useCoarsePointer()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ingest = useCallback(
    async (raw: File | null) => {
      if (!raw) {
        onChange(null)
        setError(null)
        return
      }
      if (isPdf(raw)) {
        const pdfErr = getPdfSizeError(raw)
        if (pdfErr) {
          setError(pdfErr)
          onChange(null)
          return
        }
        setError(null)
        onChange(raw)
        return
      }
      if (!raw.type.startsWith('image/')) {
        setError('Use a photo (JPEG, PNG, WebP) or a PDF.')
        return
      }
      setError(null)
      onCompressingChange?.(true)
      try {
        const compressed = await compressImage(raw)
        onChange(compressed)
      } finally {
        onCompressingChange?.(false)
      }
    },
    [onChange, onCompressingChange]
  )

  const busy = disabled || compressing

  return (
    <div>
      <label htmlFor={id} className="label-overline mb-2 inline-block">
        {label}
      </label>
      {file ? (
        <div className="ms-q-upload-file ec-card ec-card--paper flex items-center gap-3 p-4">
          <span className="ec-ink-stamp" aria-hidden>
            {isPdf(file) ? 'PDF' : 'IMG'}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate font-semibold text-[var(--ec-text-primary)]">
              {file.name}
            </p>
            <p className="font-mono text-xs text-[var(--ec-text-secondary)]">
              {isPdf(file) ? 'PDF' : 'Image'} | {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void ingest(null)}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded border ec-border-color text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
            aria-label="Remove file"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4.5 4.5 L13.5 13.5 M13.5 4.5 L4.5 13.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : touchPrimary ? (
        <div className="ms-q-upload-drop border-2 border-dashed p-5 text-center ec-border-color">
          <span className="ec-ink-stamp mx-auto mb-3" aria-hidden>
            ↑
          </span>
          <p className="font-medium text-[var(--ec-text-primary)]">
            {compressing ? 'Preparing…' : 'Photo of the question'}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--ec-text-secondary)]">
            Camera, gallery, or a PDF scan
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
              className="ec-btn-primary w-full justify-center text-sm"
            >
              Take photo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="ec-btn-secondary w-full justify-center text-sm"
            >
              Choose existing photo or PDF
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!busy) fileInputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (busy) return
            const dropped = e.dataTransfer.files?.[0]
            if (dropped) void ingest(dropped)
          }}
          onClick={() => {
            if (!busy) fileInputRef.current?.click()
          }}
          className={`ms-q-upload-drop group cursor-pointer border-2 border-dashed p-6 text-center transition-all duration-200 ${
            dragOver
              ? 'border-[var(--ec-brand)] bg-[var(--ec-brand-muted)]'
              : 'ec-border-color hover:border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] hover:bg-[var(--ec-brand-muted)]'
          }`}
        >
          <span className="ec-ink-stamp mx-auto mb-3" aria-hidden>
            ↑
          </span>
          <p className="font-medium text-[var(--ec-text-primary)]">
            {compressing ? 'Preparing…' : 'Drop question here, or choose files'}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--ec-text-secondary)]">{hint}</p>
        </div>
      )}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const raw = e.target.files?.[0] ?? null
          void ingest(raw)
          e.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const raw = e.target.files?.[0] ?? null
          void ingest(raw)
          e.target.value = ''
        }}
      />
      {error ? (
        <p className="mt-2 text-sm ec-score-low" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
