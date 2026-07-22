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
import type { SpeedAccuracyData } from '@/lib/insights/speed-accuracy'
import type { ActionPlanItem } from '@/lib/action-plan'
import { ActionPlan } from '@/components/progress/ActionPlan'
import { InsightHero } from './InsightHero'
import { PatternsPanel } from './PatternsPanel'
import { SpeedAccuracyChart } from './SpeedAccuracyChart'
import { PracticePanel } from './PracticePanel'
import { WinsPanel } from './WinsPanel'

type Props = {
  state: DashboardState
  heroInsight: HeroInsight
  patterns: Pattern[]
  speedProfile: SpeedProfile
  speedAccuracy: SpeedAccuracyData
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
  speedAccuracy,
  recommendations,
  actionItems,
  genericRecommendations,
  wins,
}: Props) {
  return (
    <div className="min-w-0 space-y-5">
      {state === 'zero' && (
        <div className="ms-dash-card ms-progress-empty">
          <div className="mx-auto max-w-md">
            <div className="ms-progress-empty-icon" aria-hidden="true">
              ✎
            </div>
            <h3 className="ms-h3" style={{ fontSize: 'clamp(22px, 4vw, 26px)' }}>
              Your dashboard starts with one question.
            </h3>
            <p className="ms-body-2" style={{ margin: '10px 0 26px' }}>
              Mark anything you&apos;ve already written — syllabus coverage, mastery
              map, and grade estimate build themselves from there.
            </p>
            <Link href="/mark" className="ec-btn-primary inline-flex text-sm">
              Mark your first question
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p
              className="font-[family-name:var(--font-handwritten,'Caveat',cursive)] text-[var(--ec-brand)]"
              style={{ fontSize: 20, marginTop: 22 }}
            >
              takes about a minute — free, no card ↑
            </p>
          </div>
        </div>
      )}

      {state !== 'zero' && <InsightHero insight={heroInsight} />}

      {/* Sits directly under the profile line it illustrates. Renders nothing
          below 3 timed attempts — a scatter of two dots implies a pattern that
          isn't there yet. */}
      <SpeedAccuracyChart data={speedAccuracy} />

      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        <PatternsPanel state={state} patterns={patterns} speedProfile={speedProfile} />
        <PracticePanel
          state={state}
          recommendations={recommendations}
          generic={genericRecommendations}
        />
        <WinsPanel state={state} wins={wins} />
      </div>

      {state === 'active' && actionItems.length > 0 && (
        <ActionPlan items={actionItems} />
      )}
    </div>
  )
}
