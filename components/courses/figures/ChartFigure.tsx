'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChartFigure as Figure } from '@/lib/courses/figures'

type VegaView = {
  finalize: () => void
  width: (w: number) => VegaView
  run: () => void
}

const MIN_WIDTH = 260
const FALLBACK_WIDTH = 560

/**
 * Vega-Lite charts for anything plotted — elasticity curves, population
 * pyramids, climate graphs, distributions.
 *
 * Vega-Lite is a declarative JSON grammar, which is the point: a generator emits
 * it far more reliably than hand-written SVG, and `validateFigure` can reject a
 * malformed spec before render.
 *
 * Width is measured and passed explicitly rather than using Vega's
 * `width: 'container'`: vega-embed wraps the host in an inline-block, which
 * measures as zero inside our scrolling figure body and renders a chart nobody
 * can see. A ResizeObserver keeps it responsive.
 */
export function ChartFigure({ figure }: { figure: Figure }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<VegaView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    const measure = () => Math.max(MIN_WIDTH, host.clientWidth || FALLBACK_WIDTH)

    void (async () => {
      try {
        const embed = (await import('vega-embed')).default
        if (cancelled || !hostRef.current) return
        const result = await embed(
          hostRef.current,
          { height: 260, ...figure.spec, width: measure() } as Parameters<typeof embed>[1],
          {
            actions: false,
            renderer: 'svg',
            // validateFigure already rejects remote `url` data; this closes the
            // door at runtime too, so a spec can never phone home.
            loader: { http: { credentials: 'omit' } },
            config: {
              background: 'transparent',
              axis: {
                labelColor: 'currentColor',
                titleColor: 'currentColor',
                domainColor: 'currentColor',
                tickColor: 'currentColor',
                grid: false,
              },
              legend: { labelColor: 'currentColor', titleColor: 'currentColor' },
              title: { color: 'currentColor' },
              view: { stroke: 'transparent' },
            },
          }
        )
        if (cancelled) {
          result.view.finalize()
          return
        }
        viewRef.current = result.view as unknown as VegaView
      } catch (err) {
        console.warn(`[figure] chart "${figure.title}" failed to render`, err)
        if (!cancelled) setFailed(true)
      }
    })()

    const observer = new ResizeObserver(() => {
      const view = viewRef.current
      if (!view) return
      view.width(measure()).run()
    })
    observer.observe(host)

    return () => {
      cancelled = true
      observer.disconnect()
      viewRef.current?.finalize()
      viewRef.current = null
    }
  }, [figure.spec, figure.title])

  if (failed) return null

  return (
    <div
      ref={hostRef}
      className="lesson-figure-chart"
      role="img"
      aria-label={figure.caption ? `${figure.title}. ${figure.caption}` : figure.title}
    />
  )
}
