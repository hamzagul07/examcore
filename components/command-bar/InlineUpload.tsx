'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Camera, FileImage, Upload } from 'lucide-react'

export function InlineUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFileSelect(file: File | undefined | null) {
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      sessionStorage.setItem('examcore_pending_upload', url)
      sessionStorage.setItem(
        'examcore_pending_upload_meta',
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
      className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all ${
        isDragging ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)]' : ''
      }`}
      style={
        isDragging
          ? undefined
          : {
              borderColor: 'var(--ec-border)',
              background: 'var(--ec-surface-raised)',
            }
      }
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ec-chat-avatar-soft">
          <Upload className="h-8 w-8 ec-text-brand" />
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
            <Camera className="h-5 w-5" />
            Use camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ec-btn-secondary flex min-h-[44px] items-center justify-center gap-2"
          >
            <FileImage className="h-5 w-5" />
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
