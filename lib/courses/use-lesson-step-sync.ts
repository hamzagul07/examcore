'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  activeBlockIndex,
  stepForBlockIndex,
  type BlockVisibility,
} from '@/lib/courses/lesson-step-sync'

/**
 * Advances the lesson diagram to match the note block the reader is on.
 *
 * Text and picture only reinforce each other when they are present together —
 * a diagram parked two sections above the prose that describes it makes the
 * reader hold both in working memory and match them up unaided. This closes
 * that gap on wide screens, where the diagram is pinned beside the notes.
 *
 * Returns a ref callback to attach to each note block, in render order.
 */
export function useLessonStepSync({
  stepCount,
  setStep,
  enabled,
}: {
  stepCount: number
  setStep: (step: number) => void
  enabled: boolean
}) {
  const nodesRef = useRef<(HTMLElement | null)[]>([])
  const visibilityRef = useRef<Map<number, BlockVisibility>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  // Read inside the observer callback so a re-render with a new closure does
  // not force the observer to be torn down and rebuilt on every scroll tick.
  const setStepRef = useRef(setStep)
  const stepCountRef = useRef(stepCount)
  const lastStepRef = useRef<number | null>(null)

  useEffect(() => {
    setStepRef.current = setStep
    stepCountRef.current = stepCount
  }, [setStep, stepCount])

  const registerBlock = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      const previous = nodesRef.current[index]
      if (previous && previous !== node) {
        observerRef.current?.unobserve(previous)
        visibilityRef.current.delete(index)
      }
      nodesRef.current[index] = node
      if (node) {
        node.dataset.noteIndex = String(index)
        observerRef.current?.observe(node)
      }
    },
    []
  )

  useEffect(() => {
    if (!enabled) return
    if (typeof IntersectionObserver === 'undefined') return

    // Captured for the cleanup closure. The ref object is never reassigned, so
    // this is the same Map either way — it just makes that explicit to the
    // exhaustive-deps rule.
    const visibility = visibilityRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const raw = (entry.target as HTMLElement).dataset.noteIndex
          if (raw === undefined) continue
          const index = Number(raw)
          if (!Number.isInteger(index)) continue
          if (entry.isIntersecting) {
            visibility.set(index, {
              index,
              ratio: entry.intersectionRatio,
              top: entry.boundingClientRect.top,
            })
          } else {
            visibility.delete(index)
          }
        }

        const active = activeBlockIndex([...visibility.values()])
        if (active === null) return
        const next = stepForBlockIndex(active, stepCountRef.current)
        // Guard the setState: the observer fires continuously while scrolling,
        // and re-setting the same step would re-render the diagram on every
        // frame of a scroll.
        if (lastStepRef.current === next) return
        lastStepRef.current = next
        setStepRef.current(next)
      },
      {
        // Ignore the top and bottom fifths of the viewport so the active block
        // is one the reader is actually looking at, not one just entering at
        // the edge.
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    observerRef.current = observer
    for (const node of nodesRef.current) {
      if (node) observer.observe(node)
    }

    return () => {
      observer.disconnect()
      observerRef.current = null
      visibility.clear()
      lastStepRef.current = null
    }
  }, [enabled])

  return registerBlock
}
