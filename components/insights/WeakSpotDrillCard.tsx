'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Target } from 'lucide-react'
import { drillHref, topicDrillHref } from '@/lib/insights/drill-link'
import type { NextDrill } from '@/lib/insights/types'

/**
 * Premium coach card: surfaces the student's single weakest topic and a one-tap
 * drill for it, from /api/insights/next-drill (same weakness engine as the
 * progress dashboard). With `subjectCode` it ranks within that subject (the
 * post-mark card); without it, globally across every subject they've marked (the
 * persistent dashboard entry). Renders nothing when no drill resolves — free
 * tier, no confirmed weakness, or subjects with no stored questions (e.g. IB) —
 * so it's never a dead card. The endpoint enforces the premium gate, so callers
 * can render this unconditionally where they don't already know paid state.
 */
export function WeakSpotDrillCard({
  subjectCode,
  title = 'Drill this next',
  className = '',
}: {
  subjectCode?: string
  title?: string
  className?: string
}) {
  const [drill, setDrill] = useState<NextDrill | null>(null)

  useEffect(() => {
    let active = true
    const qs = subjectCode
      ? `?subject=${encodeURIComponent(subjectCode)}`
      : ''
    fetch(`/api/insights/next-drill${qs}`)
      .then((r) => (r.ok ? r.json() : { drill: null }))
      .then((d) => {
        if (active) setDrill((d?.drill as NextDrill | null) ?? null)
      })
      .catch(() => {
        // Non-fatal — the surrounding page still renders.
      })
    return () => {
      active = false
    }
  }, [subjectCode])

  if (!drill) return null

  // Cambridge points at a real past-paper question; IB points at a topic the
  // /mark practice flow generates a question for.
  const label = drill.kind === 'paper' ? drill.targetLabel : drill.topicName
  const meta =
    drill.kind === 'paper'
      ? `${drill.paperCode} · Q${drill.questionNumber} · ${drill.totalMarks}m`
      : 'IB practice'
  const href =
    drill.kind === 'paper'
      ? drillHref(drill)
      : topicDrillHref(drill.subjectCode, drill.topicCode)

  return (
    <div className={`ec-card border-[var(--ec-brand)]/30 p-5 sm:p-7 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" />
        <p className="ms-micro" style={{ margin: 0 }}>
          YOUR WEAKEST SPOT
        </p>
      </div>
      <h3 className="ms-h3">{title}</h3>
      <div className="mt-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--ec-text-primary)]">
            {label}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--ec-text-secondary)]">
            {meta}
          </span>
        </div>
        <p className="ec-break-anywhere mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {drill.reason}
        </p>
        <Link
          href={href}
          className="ec-btn ec-btn-primary mt-3 inline-flex items-center gap-1.5 text-sm"
        >
          Drill this
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
