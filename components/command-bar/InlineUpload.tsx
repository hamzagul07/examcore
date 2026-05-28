'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Camera, FileImage, Upload } from 'lucide-react'

/**
 * Drag-and-drop / camera capture surface rendered inline inside a chat bubble.
 *
 * Visitor flow:
 *   1. They pick a file (drag, drop, choose, or camera capture).
 *   2. We turn it into a `blob:` URL stashed in sessionStorage under
 *      `examcore_pending_upload`. The marking page consumes it after auth.
 *   3. We route them to /auth/signup with `intent=upload` so the post-auth
 *      callback knows to drop them into /mark with the file pre-loaded.
 *
 * We DO NOT call the marking API directly here — the marking pipeline is
 * authenticated, rate-limited, and slow. The conversion play is to get them
 * to sign up first, then mark.
 */
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
      // sessionStorage / URL.createObjectURL not available — ignore, the
      // signup page still receives the intent param.
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
      className={`relative rounded-2xl border-2 border-dashed p-8 transition-all ${
        isDragging
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-white/20 bg-white/5'
      }`}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
          <Upload className="h-8 w-8 text-emerald-400" />
        </div>

        <h4 className="mb-2 font-semibold text-white">
          Take a picture of your handwritten working
        </h4>
        <p className="mb-6 text-sm text-slate-400">
          I&apos;ll mark it instantly to show you exactly how Examcore works.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3 font-semibold text-white transition-shadow hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]"
          >
            <Camera className="h-5 w-5" />
            Use camera
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-white transition-colors hover:bg-white/10"
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
