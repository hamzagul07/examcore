'use client'

import { TiltCard } from '@/components/effects/TiltCard'
import type { HeroInsight } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'
import { InsightHeroCta } from '@/components/progress/insights/InsightHeroCta'

import {
  Brain,
  Target,
  TrendingUp,
  Activity,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

const KIND_ICON: Record<HeroInsight['kind'], LucideIcon> = {
  error_pattern: Brain,
  topic_deficit: Target,
  grade_up: TrendingUp,
  momentum: Activity,
  onboarding: Sparkles,
}

export function InsightHero({ insight }: { insight: HeroInsight }) {
  const Icon = KIND_ICON[insight.kind]
  const href = insight.drill ? drillHref(insight.drill, insight.headline) : insight.ctaHref || '/mark'

  return (
    <TiltCard intensity={4} className="min-w-0 rounded-3xl">
      <div className="ec-card-brand relative h-full min-w-0 overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-[90px]"
          style={{ background: 'var(--ec-brand-muted)' }}
          aria-hidden="true"
        />
        <div className="relative min-w-0">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ec-brand)]/30 bg-[var(--ec-brand-muted)]">
              <Icon className="h-5 w-5 text-[var(--ec-brand)]" aria-hidden="true" />
            </div>
            <p className="ec-label-tech">{insight.eyebrow}</p>
          </div>

          <h2 className="ec-break-anywhere max-w-2xl text-title sm:text-3xl">
            {insight.headline}
          </h2>
          <p className="ec-break-anywhere mt-4 max-w-2xl text-base leading-relaxed text-[var(--ec-text-secondary)]">
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
      </div>
    </TiltCard>
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
      <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'var(--ec-brand-gradient)',
            boxShadow: '0 0 12px var(--ec-brand-muted)',
          }}
        />
      </div>
    </div>
  )
}
