'use client'

import type { HeroInsight } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'
import { InsightHeroCta } from '@/components/progress/insights/InsightHeroCta'

const KIND_GLYPH: Record<HeroInsight['kind'], string> = {
  error_pattern: '∴',
  topic_deficit: '◆',
  grade_up: '↑',
  momentum: '→',
  onboarding: 'M1',
}

export function InsightHero({ insight }: { insight: HeroInsight }) {
  const glyph = KIND_GLYPH[insight.kind]
  const href = insight.drill ? drillHref(insight.drill, insight.headline) : insight.ctaHref || '/mark'

  return (
    <div className="ms-insight-hero min-w-0">
      <div className="ms-insight-hero__meta">
        <span className="ec-ink-stamp" aria-hidden>
          {glyph}
        </span>
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          {insight.eyebrow}
        </p>
      </div>

      <h2 className="ms-h3 ec-break-anywhere max-w-2xl" style={{ fontSize: 'clamp(26px, 4vw, 34px)', marginTop: 14 }}>
        {insight.headline}
      </h2>
      <p className="ms-body-2 ec-break-anywhere mt-4 max-w-2xl">
        {insight.body}
      </p>

      {insight.progress && (
        <HeroProgress
          current={insight.progress.current}
          target={insight.progress.target}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <InsightHeroCta href={href} label={insight.ctaLabel} />
        {insight.drill && (
          <span className="ec-break-anywhere font-mono text-xs text-[var(--ec-text-secondary)]">
            {insight.drill.paperCode} · Q{insight.drill.questionNumber} · {insight.drill.totalMarks} marks
          </span>
        )}
      </div>
    </div>
  )
}

function HeroProgress({ current, target }: { current: number; target: number }) {
  const clamped = Math.min(current, target)
  const pct = Math.round((clamped / target) * 100)
  return (
    <div className="mt-6 max-w-md">
      <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ec-text-secondary)]">
        <span>{clamped} of {target} marked</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-[2px] border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))]">
        <div
          className="h-full rounded-[1px] transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'var(--ec-brand)',
          }}
        />
      </div>
    </div>
  )
}
