'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { mapAttemptsToFlowParams } from '@/lib/generative/data-mapper'
import { renderFlowFieldArt } from '@/lib/generative/art-renderer'
import {
  buildArtCacheKey,
  readArtCache,
  writeArtCache,
} from '@/lib/generative/art-cache'
import { artDimensions, type DeviceTier } from '@/lib/hooks/useDeviceTier'
import type { JournalSubjectPage } from '@/lib/dashboard/journal-data'

type Props = {
  userId: string
  firstName: string
  pages: JournalSubjectPage[]
  tier: DeviceTier
  isOpen: boolean
  pageIndex: number
  onOpen: () => void
  onPageChange: (index: number) => void
  reduceMotion: boolean
}

export function PageContent({
  userId,
  subjectCode,
  attempts,
  tier,
  previewOnly,
}: {
  userId: string
  subjectCode: string
  attempts: JournalSubjectPage['attempts']
  tier: DeviceTier
  previewOnly?: boolean
}) {
  const { theme } = useEcTheme()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = mapAttemptsToFlowParams(userId, subjectCode, attempts, previewOnly)
    const cacheKey = previewOnly
      ? `ec-journal-preview:${subjectCode}`
      : buildArtCacheKey(
          userId,
          subjectCode,
          attempts.length,
          attempts[0]?.id ?? 'none'
        )

    const cached = readArtCache(cacheKey)
    if (cached) {
      setSrc(cached)
      return
    }

    const run = () => {
      const dim = artDimensions(tier)
      const url = renderFlowFieldArt(params, {
        width: dim.width,
        height: dim.height,
        subjectCode,
        zenMode: theme === 'zen',
      })
      if (!cancelled) {
        writeArtCache(cacheKey, url)
        setSrc(url)
      }
    }

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 2000 })
      return () => {
        cancelled = true
        cancelIdleCallback(id)
      }
    }
    const t = setTimeout(run, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [userId, subjectCode, attempts, tier, previewOnly, theme])

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--ec-surface)]">
        <p className="text-caption animate-pulse">Rendering page…</p>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
  )
}
