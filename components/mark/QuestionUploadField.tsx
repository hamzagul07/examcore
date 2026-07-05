'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { compressImage } from '@/lib/upload/compress-image'
import { formatFileSize, getPdfSizeError } from '@/lib/upload/upload-limits'

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
  hint = 'JPEG, PNG, WebP, or PDF - drag and drop',
  file,
  onChange,
  disabled = false,
  compressing = false,
  onCompressingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
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
        <div className="ms-q-upload-file ec-card flex items-center gap-3 p-4">
          <span
            className="ms-q-upload-file-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            aria-hidden
          >
            {isPdf(file) ? (
              <FileText className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ec-border-color text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!busy) inputRef.current?.click()
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
            if (!busy) inputRef.current?.click()
          }}
          className={`ms-q-upload-drop group cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
            dragOver
              ? 'border-[var(--ec-brand)] bg-[var(--ec-brand-muted)]'
              : 'ec-border-color ec-bg-surface-raised hover:border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] hover:bg-[var(--ec-brand-muted)]'
          }`}
        >
          <UploadCloud className="mx-auto mb-2 h-6 w-6 text-[var(--ec-text-secondary)] transition-colors group-hover:text-[var(--ec-brand)]" />
          <p className="font-medium text-[var(--ec-text-primary)]">
            {compressing ? 'Preparing...' : 'Drop question here or click to upload'}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--ec-text-secondary)]">{hint}</p>
        </div>
      )}
      <input
        ref={inputRef}
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
