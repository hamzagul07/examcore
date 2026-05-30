'use client'

import Image from 'next/image'

type Props = {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
}

export function LandingScreenshotFrame({
  src,
  alt,
  width,
  height,
  priority = false,
}: Props) {
  return (
    <div className="ec-card relative overflow-hidden p-2 shadow-[var(--ec-card-shadow)] ring-1 ring-[var(--ec-border)] transition-transform duration-300 hover:scale-[1.01] sm:p-2.5">
      <div className="flex items-center gap-2 border-b border-[var(--ec-border)] px-3 py-2.5 sm:px-4">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/40 sm:h-3 sm:w-3" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-500/40 sm:h-3 sm:w-3" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/40 sm:h-3 sm:w-3" />
        <div className="ml-2 flex-1 rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--ec-text-secondary)] sm:text-xs">
          examcore.ai/mark
        </div>
      </div>
      <div className="relative bg-[var(--ec-surface)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="h-auto w-full"
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
        />
      </div>
    </div>
  )
}
