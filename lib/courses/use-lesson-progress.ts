'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fromStored,
  isSectionRead,
  progressPercent,
  toStored,
  type SectionState,
  type StoredProgress,
} from '@/lib/courses/lesson-progress'

const TICK_MS = 500

/**
 * Tracks which lesson sections the student has actually worked through.
 *
 * One IntersectionObserver and one interval, regardless of section count: the
 * observer keeps a ratio per section, and each tick credits dwell to the single
 * most-visible one. Crediting every visible section would let one scroll
 * position complete three sections at once.
 *
 * Attention is not credited while the tab is hidden — leaving a lesson open in a
 * background tab is not reading it.
 */
export function useLessonProgress(
  sectionIds: string[],
  storageKey: string | null
) {
  const [states, setStates] = useState<SectionState[]>([])
  const ratios = useRef<Map<string, number>>(new Map())
  const statesRef = useRef<SectionState[]>([])
  const idsKey = sectionIds.join('|')

  const lsKey = storageKey ? `ms:lessonprog:${storageKey}` : null

  // Restore, then measure. Heights are read live each tick, so a section that
  // grows (an explanation opening) raises its own bar.
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : []
    let stored: StoredProgress | null = null
    if (lsKey) {
      try {
        const raw = window.localStorage.getItem(lsKey)
        if (raw) stored = JSON.parse(raw) as StoredProgress
      } catch {
        /* private mode — progress just does not persist */
      }
    }
    const heights: Record<string, number> = {}
    for (const id of ids) {
      heights[id] = document.getElementById(id)?.getBoundingClientRect().height ?? 0
    }
    const next = fromStored(stored, ids, heights)
    statesRef.current = next
    setStates(next)
  }, [idsKey, lsKey])

  // Observe visibility.
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : []
    if (!ids.length || typeof IntersectionObserver === 'undefined') return
    const seen = ratios.current
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id
          if (!id) continue
          // Score by how much of the VIEWPORT the section fills, not how much
          // of the section is visible. intersectionRatio is the latter, which
          // is backwards for reading: a short pinned diagram sits at 1.0 while
          // the long notes section you are actually reading sits at 0.3, so the
          // diagram stole the credit and the notes never completed.
          const vh = window.innerHeight || 1
          seen.set(id, e.isIntersecting ? e.intersectionRect.height / vh : 0)
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1] }
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => {
      observer.disconnect()
      seen.clear()
    }
  }, [idsKey])

  // Credit attention.
  useEffect(() => {
    if (!idsKey) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      let bestId: string | null = null
      let best = 0
      for (const [id, ratio] of ratios.current) {
        // Must fill a meaningful slice of the screen — a strip at the edge of
        // the viewport is not what is being read.
        if (ratio > best && ratio >= 0.18) {
          best = ratio
          bestId = id
        }
      }
      if (!bestId) return

      const prev = statesRef.current
      const idx = prev.findIndex((s) => s.id === bestId)
      if (idx === -1) return
      const el = document.getElementById(bestId)
      const heightPx = el?.getBoundingClientRect().height ?? prev[idx].heightPx
      const wasRead = isSectionRead(prev[idx])
      const updated: SectionState = {
        ...prev[idx],
        dwellMs: prev[idx].dwellMs + TICK_MS,
        heightPx,
      }
      if (wasRead && isSectionRead(updated) && updated.heightPx === prev[idx].heightPx) {
        // Already complete and unchanged — nothing to re-render for.
        statesRef.current = prev.map((s, i) => (i === idx ? updated : s))
        return
      }
      const next = prev.map((s, i) => (i === idx ? updated : s))
      statesRef.current = next
      setStates(next)
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [idsKey])

  // Persist, throttled by React's own batching rather than every tick.
  useEffect(() => {
    if (!lsKey || !states.length) return
    try {
      window.localStorage.setItem(lsKey, JSON.stringify(toStored(states)))
    } catch {
      /* ignore */
    }
  }, [lsKey, states])

  /** Mark a section complete because the student did something in it. */
  const markInteracted = useCallback((id: string) => {
    const prev = statesRef.current
    const idx = prev.findIndex((s) => s.id === id)
    if (idx === -1 || prev[idx].interacted) return
    const next = prev.map((s, i) => (i === idx ? { ...s, interacted: true } : s))
    statesRef.current = next
    setStates(next)
  }, [])

  const readIds = useMemo(
    () => new Set(states.filter(isSectionRead).map((s) => s.id)),
    [states]
  )

  return {
    readIds,
    percent: progressPercent(states),
    markInteracted,
  }
}
