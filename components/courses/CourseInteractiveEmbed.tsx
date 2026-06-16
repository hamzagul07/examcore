'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { ExternalLink, Loader2, Maximize2, X } from 'lucide-react'
import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import {
  embedSlowLoadHintMs,
  isCheerpjEmbedUrl,
  resolveEmbedLaunchUrl,
} from '@/lib/courses/interactive-embeds'

type Props = {
  embed: LessonInteractiveEmbed
  className?: string
  /** e.g. "Step 2 of 4" when synced with the step carousel */
  stepLabel?: string
  /** Diagram shell: viewport-sized stage, no fixed aspect-ratio inline style */
  layout?: 'default' | 'diagram'
}

function launchLabel(provider: LessonInteractiveEmbed['provider']): string {
  if (provider === 'phet') return 'Open on PhET'
  if (provider === 'geogebra') return 'Open on GeoGebra'
  return 'Open simulation'
}

export function CourseInteractiveEmbed({ embed, className = '', stepLabel, layout = 'default' }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showSlowHint, setShowSlowHint] = useState(false)
  const aspectRatio = embed.aspectRatio ?? '834 / 504'
  const launchUrl = resolveEmbedLaunchUrl(embed)
  const label = launchLabel(embed.provider)
  const cheerpj = isCheerpjEmbedUrl(embed.embedUrl)
  const iframeId = useId()
  const inDiagram = layout === 'diagram'

  const handleLoad = useCallback(() => {
    setLoaded(true)
    setShowSlowHint(false)
  }, [])

  useEffect(() => {
    setLoaded(false)
    setShowSlowHint(false)
    const timer = window.setTimeout(() => setShowSlowHint(true), embedSlowLoadHintMs(embed.embedUrl))
    return () => window.clearTimeout(timer)
  }, [embed.embedUrl])

  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  return (
    <figure
      className={`course-interactive-embed ${inDiagram ? 'course-interactive-embed--diagram' : ''} ${fullscreen ? 'course-interactive-embed--fullscreen' : ''} ${className}`.trim()}
    >
      {fullscreen ? (
        <div className="course-interactive-embed-overlay-bar">
          <span className="text-sm font-semibold text-[var(--ec-text-primary)]">{embed.title}</span>
          <div className="flex items-center gap-2">
            {launchUrl ? (
              <a
                href={launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="course-interactive-embed-btn"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {label}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="course-interactive-embed-btn"
              aria-label="Close full screen"
            >
              <X className="h-5 w-5" aria-hidden />
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="course-interactive-embed-head">
          <div className="min-w-0">
            <p className="ms-overline" style={{ marginBottom: 4 }}>
              Live interactive{stepLabel ? ` · ${stepLabel}` : ''}
            </p>
            <figcaption className="course-interactive-embed-title">{embed.title}</figcaption>
            {embed.hint ? (
              <p className="course-interactive-embed-hint">{embed.hint}</p>
            ) : null}
          </div>
          <div className="course-interactive-embed-actions">
            {launchUrl ? (
              <a
                href={launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="course-interactive-embed-btn course-interactive-embed-btn--primary"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {label}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="course-interactive-embed-btn"
              aria-label="Open simulation full screen"
              disabled={!loaded}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              Full screen
            </button>
          </div>
        </div>
      )}

      <div
        className="course-interactive-embed-stage"
        style={fullscreen || inDiagram ? undefined : { aspectRatio }}
      >
        {!loaded ? (
          <div className="course-interactive-embed-loading" aria-live="polite">
            <Loader2 className="course-interactive-embed-spinner h-8 w-8" aria-hidden />
            <p className="course-interactive-embed-loading-title">Loading simulation…</p>
            {cheerpj ? (
              <p className="course-interactive-embed-loading-detail">
                Java-based PhET sim — first load can take 10–20 seconds.
              </p>
            ) : (
              <p className="course-interactive-embed-loading-detail">
                Fetching from {embed.provider === 'geogebra' ? 'GeoGebra' : 'PhET'}…
              </p>
            )}
            {showSlowHint && launchUrl ? (
              <p className="course-interactive-embed-loading-slow">
                Still waiting?{' '}
                <a href={launchUrl} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>{' '}
                opens directly in a new tab.
              </p>
            ) : null}
          </div>
        ) : null}

        <iframe
          id={iframeId}
          src={embed.embedUrl}
          title={embed.title}
          className={`course-interactive-embed-frame ${loaded ? 'is-loaded' : ''}`}
          loading={cheerpj ? 'eager' : 'lazy'}
          allowFullScreen
          allow="fullscreen; autoplay; clipboard-write"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handleLoad}
        />
      </div>

      {!fullscreen && launchUrl && !cheerpj ? (
        <p className="course-interactive-embed-fallback-hint">
          If the embed does not load, use{' '}
          <a href={launchUrl} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
          .
        </p>
      ) : null}

      {!fullscreen ? (
        <p className="course-interactive-embed-attribution">
          {embed.attribution.source} · {embed.attribution.license}
        </p>
      ) : null}
    </figure>
  )
}
