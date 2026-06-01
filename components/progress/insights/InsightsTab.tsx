import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type {
  DashboardState,
  HeroInsight,
  Pattern,
  Recommendation,
  Win,
} from '@/lib/insights/types'
import type { SpeedProfile } from '@/lib/insights/patterns'
import type { ActionPlanItem } from '@/lib/action-plan'
import { InsightHero } from './InsightHero'
import { PatternsPanel } from './PatternsPanel'
import { PracticePanel } from './PracticePanel'
import { WinsPanel } from './WinsPanel'

type Props = {
  state: DashboardState
  heroInsight: HeroInsight
  patterns: Pattern[]
  speedProfile: SpeedProfile
  recommendations: Recommendation[]
  actionItems: ActionPlanItem[]
  genericRecommendations: boolean
  wins: Win[]
}

export function InsightsTab({
  state,
  heroInsight,
  patterns,
  speedProfile,
  recommendations,
  actionItems,
  genericRecommendations,
  wins,
}: Props) {
  return (
    <div className="space-y-5">
      {state === 'zero' && (
        <Link
          href="/mark"
          className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 px-5 py-4 transition-colors hover:border-[var(--ec-brand)]/50"
        >
          <span className="text-sm font-semibold text-[var(--ec-text-primary)]">
            Mark your first question to unlock your insights
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]">
            Mark your first question
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      )}

      <InsightHero insight={heroInsight} />

      <div className="grid gap-5 lg:grid-cols-3">
        <PatternsPanel state={state} patterns={patterns} speedProfile={speedProfile} />
        <PracticePanel
          state={state}
          recommendations={recommendations}
          actionItems={actionItems}
          generic={genericRecommendations}
        />
        <WinsPanel state={state} wins={wins} />
      </div>
    </div>
  )
}
