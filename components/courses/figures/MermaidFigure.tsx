'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { MermaidFigure as Figure } from '@/lib/courses/figures'

/**
 * Resolves a CSS expression to a concrete hex colour.
 *
 * Mermaid derives borders and contrast shades from the theme colours it is
 * given, and its colour library throws on `var(--token)`. Painting the resolved
 * value onto a 1×1 canvas normalises whatever the design system produced —
 * hex, `oklch()`, `color-mix()` — down to plain rgb that mermaid can work with,
 * while still reflecting the live theme.
 */
function resolveCssColor(expr: string, fallback: string): string {
  try {
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;color:${expr}`
    document.body.appendChild(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.fillStyle = fallback
    ctx.fillStyle = computed
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return fallback
  }
}

/**
 * Timelines, flowcharts and mind maps — the shapes most of the zero-coverage
 * humanities subjects actually need.
 *
 * Mermaid is ~500 kB, so it is imported on mount rather than in the page bundle;
 * lessons without a mermaid figure never download it.
 */
export function MermaidFigure({ figure }: { figure: Figure }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [themeKey, setThemeKey] = useState(0)
  // Mermaid needs a DOM-safe id for the element it renders through.
  const idRef = useRef(`mmd-${useId().replace(/:/g, '')}`)

  // Re-render on theme switch: mermaid bakes colours into the SVG, so a stale
  // diagram would keep light-theme fills on a dark page.
  useEffect(() => {
    const target = document.documentElement
    const observer = new MutationObserver(() => setThemeKey((n) => n + 1))
    observer.observe(target, { attributes: true, attributeFilter: ['data-ec-theme', 'class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        if (cancelled) return
        mermaid.initialize({
          startOnLoad: false,
          // Content is ours, but strict blocks inline scripts and click handlers
          // regardless — a generated spec should never be able to run anything.
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'inherit',
          themeVariables: {
            primaryColor: resolveCssColor('var(--ec-surface-muted)', '#eeeae2'),
            primaryTextColor: resolveCssColor('var(--ec-text-primary)', '#1d1b16'),
            primaryBorderColor: resolveCssColor('var(--ec-brand)', '#19774d'),
            lineColor: resolveCssColor('var(--ec-brand)', '#19774d'),
            secondaryColor: resolveCssColor('var(--ec-surface-raised)', '#f7f5f0'),
            tertiaryColor: resolveCssColor('var(--ec-surface)', '#fbfaf7'),
            textColor: resolveCssColor('var(--ec-text-primary)', '#1d1b16'),
            background: resolveCssColor('var(--ec-surface-raised)', '#f7f5f0'),
          },
        })
        const { svg: out } = await mermaid.render(idRef.current, figure.source)
        if (!cancelled) {
          setSvg(out)
          setFailed(false)
        }
      } catch (err) {
        // Surfaced rather than swallowed: a figure that silently renders nothing
        // is the hardest kind of authoring bug to notice.
        console.warn(`[figure] mermaid "${figure.title}" failed to render`, err)
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [figure.source, figure.title, themeKey])

  if (failed) return null
  if (!svg) return <div className="lesson-figure-loading" aria-hidden />

  return (
    <div
      className="lesson-figure-mermaid"
      role="img"
      aria-label={figure.caption ? `${figure.title}. ${figure.caption}` : figure.title}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
