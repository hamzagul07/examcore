'use client'

import type {
  ActionPlanItem,
  ActionPlanType,
} from '@/lib/action-plan'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  items: ActionPlanItem[]
}

const GLYPHS: Record<ActionPlanType, string> = {
  onboarding: 'M1',
  blindspot: '◆',
  deficit: '↓',
  grade_booster: '↑',
  time_warning: 'T',
  time_optimization: 'H',
  streak: 'S',
  coverage: '¶',
  encouragement: '→',
  sampled: '✓',
}

const TINTS: Record<
  ActionPlanType,
  { iconBg: string; iconRing: string; chip: string }
> = {
  onboarding: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    chip: 'ec-tint-success-chip',
  },
  blindspot: {
    iconBg: 'ec-tint-accent-icon',
    iconRing: 'border',
    chip: 'ec-tint-accent-chip',
  },
  deficit: {
    iconBg: 'ec-tint-critical-icon',
    iconRing: 'border',
    chip: 'ec-tint-critical-chip',
  },
  grade_booster: {
    iconBg: 'ec-tint-warning-icon',
    iconRing: 'border',
    chip: 'ec-tint-warning-chip',
  },
  time_warning: {
    iconBg: 'ec-tint-warning-icon',
    iconRing: 'border',
    chip: 'ec-tint-warning-chip',
  },
  time_optimization: {
    iconBg: 'ec-tint-info-icon',
    iconRing: 'border',
    chip: 'ec-tint-info-chip',
  },
  streak: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    chip: 'ec-tint-success-chip',
  },
  coverage: {
    iconBg: 'ec-tint-info-icon',
    iconRing: 'border',
    chip: 'ec-tint-info-chip',
  },
  encouragement: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    chip: 'ec-tint-success-chip',
  },
  sampled: {
    iconBg: 'ec-tint-sampled-icon',
    iconRing: 'border',
    chip: 'ec-tint-sampled-chip',
  },
}

const TYPE_LABELS: Record<ActionPlanType, string> = {
  onboarding: 'Getting started',
  blindspot: 'Blindspot',
  deficit: 'Deficit',
  grade_booster: 'Grade booster',
  time_warning: 'Pacing',
  time_optimization: 'Habit',
  streak: 'Streak',
  coverage: 'Coverage',
  encouragement: 'Keep going',
  sampled: 'Confirm mastery',
}

export function ActionPlan({ items }: Props) {
  return (
    <section className="ms-action-plan ms-dash-card">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold text-[var(--ec-brand)]"
            aria-hidden
          >
            ◆
          </span>
          <p className="ms-overline" style={{ marginBottom: 0 }}>
            Fix next
          </p>
        </div>
        <h2 className="ms-h3">Your next three moves</h2>
        <p className="ms-body-2 mt-2">
          Personalized from your attempts, mastery levels, and recent activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <ActionCard key={`${item.type}-${i}`} item={item} index={i} />
        ))}
      </div>
    </section>
  )
}

function ActionCard({
  item,
  index,
}: {
  item: ActionPlanItem
  index: number
}) {
  const glyph = GLYPHS[item.type]
  const tint = TINTS[item.type]
  const crimson = item.type === 'deficit' || item.type === 'blindspot' || item.type === 'time_warning'
  return (
    <div className="ms-dash-card ms-action-card group relative flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className={`ec-ink-stamp${crimson ? ' ec-ink-stamp--crimson' : ''}`} aria-hidden>
          {glyph}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${tint.chip}`}
          >
            {TYPE_LABELS[item.type]}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ec-text-secondary)]">
            #{index + 1}
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold tracking-tight text-[var(--ec-text-primary)]">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        {item.body}
      </p>

      <LoadingLink
        href={item.ctaHref}
        loadingText="Opening..."
        className="ec-btn-secondary ms-action-cta mt-5 w-full justify-center self-stretch px-3.5 py-2 text-sm sm:w-auto sm:self-start"
      >
        {item.ctaText}
        <span className="font-mono text-[11px] font-bold" aria-hidden>
          -&gt;
        </span>
      </LoadingLink>
    </div>
  )
}
