import Link from 'next/link'
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
    iconBg: 'bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    iconRing: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    chip: 'bg-emerald-950 text-emerald-400 border-emerald-900',
  },
  blindspot: {
    iconBg: 'bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    iconRing: 'border-violet-500/30',
    iconColor: 'text-violet-400',
    chip: 'bg-violet-950 text-violet-400 border-violet-900',
  },
  deficit: {
    iconBg: 'bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    iconRing: 'border-red-500/30',
    iconColor: 'text-red-400',
    chip: 'bg-red-950 text-red-400 border-red-900',
  },
  grade_booster: {
    iconBg: 'bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    iconRing: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    chip: 'bg-amber-950 text-amber-400 border-amber-900',
  },
  time_warning: {
    iconBg: 'bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    iconRing: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    chip: 'bg-orange-950 text-orange-400 border-orange-900',
  },
  time_optimization: {
    iconBg: 'bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    iconRing: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    chip: 'bg-cyan-950 text-cyan-400 border-cyan-900',
  },
  streak: {
    iconBg: 'bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    iconRing: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    chip: 'bg-rose-950 text-rose-400 border-rose-900',
  },
  coverage: {
    iconBg: 'bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    iconRing: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    chip: 'bg-cyan-950 text-cyan-400 border-cyan-900',
  },
  encouragement: {
    iconBg: 'bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    iconRing: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    chip: 'bg-emerald-950 text-emerald-400 border-emerald-900',
  },
  sampled: {
    iconBg: 'bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.3)]',
    iconRing: 'border-sky-500/30',
    iconColor: 'text-sky-400',
    chip: 'bg-sky-950 text-sky-300 border-sky-900',
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
          <Target className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <p className="ec-label-tech">ACTION PLAN</p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Your next three moves
        </h2>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
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
          <Icon className={`h-5 w-5 ${tint.iconColor}`} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tint.chip}`}
          >
            {TYPE_LABELS[item.type]}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            #{index + 1}
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold tracking-tight text-white">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
        {item.body}
      </p>

      <Link
        href={item.ctaHref}
        className="ec-btn-secondary mt-5 self-start text-sm"
        style={{ padding: '8px 14px' }}
      >
        {item.ctaText}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
      </div>
    </TiltCard>
  )
}
