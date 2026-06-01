'use client'

import {
  ArrowRight,
  Target,
  Zap,
  Clock,
  Flame,
  Map,
  Sparkles,
  TrendingDown,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import type {
  ActionPlanItem,
  ActionPlanType,
} from '@/lib/action-plan'
import { TiltCard } from '@/components/effects/TiltCard'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  items: ActionPlanItem[]
}

const ICONS: Record<ActionPlanType, LucideIcon> = {
  onboarding: Sparkles,
  blindspot: Target,
  deficit: TrendingDown,
  grade_booster: Zap,
  time_warning: Clock,
  time_optimization: CalendarClock,
  streak: Flame,
  coverage: Map,
  encouragement: Sparkles,
  sampled: Sparkles,
}

const TINTS: Record<
  ActionPlanType,
  { iconBg: string; iconRing: string; iconColor: string; chip: string }
> = {
  onboarding: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-success-chip',
  },
  blindspot: {
    iconBg: 'ec-tint-accent-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-accent-chip',
  },
  deficit: {
    iconBg: 'ec-tint-critical-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-critical-chip',
  },
  grade_booster: {
    iconBg: 'ec-tint-warning-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-warning-chip',
  },
  time_warning: {
    iconBg: 'ec-tint-warning-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-warning-chip',
  },
  time_optimization: {
    iconBg: 'ec-tint-info-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-info-chip',
  },
  streak: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-success-chip',
  },
  coverage: {
    iconBg: 'ec-tint-info-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-info-chip',
  },
  encouragement: {
    iconBg: 'ec-tint-success-icon',
    iconRing: 'border',
    iconColor: '',
    chip: 'ec-tint-success-chip',
  },
  sampled: {
    iconBg: 'ec-tint-sampled-icon',
    iconRing: 'border',
    iconColor: '',
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
    <section className="ec-card-premium p-5 sm:p-7">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 ec-text-brand" aria-hidden="true" />
          <p className="ec-label-tech">ACTION PLAN</p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-3xl">
          Your next three moves
        </h2>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)] sm:text-base">
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
  const Icon = ICONS[item.type]
  const tint = TINTS[item.type]
  return (
    <TiltCard intensity={5} className="h-full rounded-3xl">
      <div className="ec-card ec-card-interactive group relative flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tint.iconBg} ${tint.iconRing}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tint.chip}`}
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
        className="ec-btn-secondary mt-5 self-start px-3.5 py-2 text-sm"
      >
        {item.ctaText}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </LoadingLink>
      </div>
    </TiltCard>
  )
}
