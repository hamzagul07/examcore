'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MasteryLevel } from '@/lib/mastery'

export type MasteryTopic = {
  code: string
  name: string
  level: MasteryLevel
  percentage: number
  attemptsCount: number
  href: string | null
}

/** Weakest-first: critical before sampled; unattempted/strong topics excluded. */
const WEAK_RANK: Partial<Record<MasteryLevel, number>> = {
  critical: 0,
  sampled: 1,
}

/**
 * Fetches the signed-in user's per-topic mastery for a subject and derives the
 * current lesson's standing + the single weakest topic to study next.
 * `enabled` should be the signed-in flag so guests never hit the auth-gated API.
 */
export function useLessonMastery(
  subjectCode: string,
  topicCode: string,
  enabled: boolean
) {
  const [topics, setTopics] = useState<MasteryTopic[] | null>(null)

  useEffect(() => {
    if (!enabled || !subjectCode) {
      setTopics(null)
      return
    }
    let active = true
    fetch(`/api/courses/mastery?subject=${encodeURIComponent(subjectCode)}`)
      .then((r) => (r.ok ? r.json() : { topics: [] }))
      .then((d) => {
        if (active) setTopics(Array.isArray(d?.topics) ? d.topics : [])
      })
      .catch(() => {
        if (active) setTopics([])
      })
    return () => {
      active = false
    }
  }, [enabled, subjectCode])

  const current = useMemo(
    () => topics?.find((t) => t.code === topicCode) ?? null,
    [topics, topicCode]
  )

  const weakest = useMemo(() => {
    if (!topics) return null
    return (
      topics
        .filter(
          (t) =>
            t.code !== topicCode &&
            t.href &&
            WEAK_RANK[t.level] !== undefined
        )
        .sort(
          (a, b) =>
            (WEAK_RANK[a.level]! - WEAK_RANK[b.level]!) ||
            a.percentage - b.percentage
        )[0] ?? null
    )
  }, [topics, topicCode])

  return { current, weakest, loading: enabled && topics === null }
}
