'use client'

import { useEffect, useRef, useState } from 'react'
import type { MoleculeFigure as Figure } from '@/lib/courses/figures'

/**
 * SMILES → 2D skeletal structure.
 *
 * Replaces hand-drawn hexagons: `c1ccccc1` always produces a correct benzene
 * ring, and every organic chemistry topic becomes a one-line authoring job.
 * smiles-drawer is pure JS (~100 kB) — deliberately chosen over RDKit's ~7 MB
 * WASM build, which would need its own asset pipeline for the same 2D output.
 */
export function MoleculeFigure({ figure }: { figure: Figure }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    void (async () => {
      try {
        const mod = await import('smiles-drawer')
        if (cancelled) return
        const SmilesDrawer = (mod as { default?: unknown }).default ?? mod
        const { Drawer, parse } = SmilesDrawer as {
          Drawer: new (opts: Record<string, unknown>) => {
            draw: (tree: unknown, target: HTMLCanvasElement, theme: string) => void
          }
          parse: (
            smiles: string,
            ok: (tree: unknown) => void,
            fail: (err: unknown) => void
          ) => void
        }

        const dark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches

        const drawer = new Drawer({ width: 360, height: 240, bondThickness: 1.1, padding: 16 })
        parse(
          figure.smiles,
          (tree) => {
            if (cancelled || !canvasRef.current) return
            drawer.draw(tree, canvasRef.current, dark ? 'dark' : 'light')
          },
          () => {
            if (!cancelled) setFailed(true)
          }
        )
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [figure.smiles])

  if (failed) return null

  return (
    <canvas
      ref={canvasRef}
      className="lesson-figure-molecule"
      role="img"
      aria-label={figure.caption ? `${figure.title}. ${figure.caption}` : figure.title}
    />
  )
}
