'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { drillHref, topicDrillHref } from '@/lib/insights/drill-link'
import type { NextDrill } from '@/lib/insights/types'

/**
 * Surfaces the student's single weakest topic and a one-tap drill —
 * tally slip language, no Lucide.
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
    <div className={`ms-weak-spot ${className}`.trim()}>
      <div className="ms-weak-spot__meta">
        <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
          DR
        </span>
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          Your weakest spot
        </p>
      </div>
      <h3 className="ms-h3" style={{ marginTop: 12 }}>
        {title}
      </h3>
      <div className="ms-weak-spot__slip">
        <div className="ms-weak-spot__row">
          <span className="ms-weak-spot__label">{label}</span>
          <span className="ms-weak-spot__code">{meta}</span>
        </div>
        <p className="ms-weak-spot__reason">{drill.reason}</p>
        <Link
          href={href}
          className="ec-btn-primary mt-3 inline-flex items-center gap-2 text-sm"
        >
          Drill this
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </Link>
      </div>
    </div>
  )
}
