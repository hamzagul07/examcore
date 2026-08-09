'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { STORAGE_KEYS, writeSessionStorage } from '@/lib/client-storage'

export function InlineUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFileSelect(file: File | undefined | null) {
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      writeSessionStorage(STORAGE_KEYS.pendingUpload, url)
      writeSessionStorage(
        STORAGE_KEYS.pendingUploadMeta,
        JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: Date.now(),
        })
      )
    } catch {
      // sessionStorage unavailable — signup still receives intent param.
    }
    router.push('/auth/signup?intent=upload')
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileSelect(e.dataTransfer.files?.[0])
      }}
      className={`relative rounded border-2 border-dashed p-6 sm:p-8 transition-all ${
        isDragging ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)]' : ''
      }`}
      style={
        isDragging
          ? undefined
          : {
              borderColor: 'var(--ec-border)',
              background: 'var(--ec-paper, var(--ec-surface-raised))',
              boxShadow: 'var(--ec-shadow-hard, 4px 4px 0 rgba(0, 0, 0, 0.08))',
            }
      }
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)]">
          <span className="font-mono text-xl font-bold tracking-wide ec-text-brand" aria-hidden>
            ↑
          </span>
        </div>

        <h4 className="mb-2 font-semibold text-[var(--ec-text-primary)]">
          Take a picture of your handwritten working
        </h4>
        <p className="mb-6 text-sm text-[var(--ec-text-secondary)]">
          I&apos;ll mark it instantly to show you exactly how MarkScheme works.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="ec-btn-primary flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>IMG</span>
            Use camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ec-btn-secondary flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>PDF</span>
            Choose file
          </button>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        className="hidden"
      />
    </motion.div>
  )
}
