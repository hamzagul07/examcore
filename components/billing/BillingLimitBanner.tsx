'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApproachingLimitBanner } from '@/components/billing/ApproachingLimitBanner'
import { BillingBlockedBanner } from '@/components/billing/BillingBlockedBanner'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'
import { classBonusFromSummary, classBonusNote } from '@/lib/billing/teacher-seat'

const DISMISS_KEY = 'ec:billing-limit-banner-dismissed'

type Props = {
  className?: string
}

function approachingFocus(
  summary: BillingSummaryClient
): 'questions' | 'omni' | 'both' | null {
  if (summary.enforcement_mode === 'off') return null
  const q = summary.questions.warning
  const o = summary.omni.warning
  if (!q && !o) return null
  if (q && o) return 'both'
  if (o) return 'omni'
  return 'questions'
}

/**
 * One line under the banner when the question cap includes a class bonus, so
 * a student in a verified teacher's class is not left thinking their cap is
 * the plain free allowance. Only for the question cap: study chat has no
 * class bonus, so an omni-only banner says nothing about it.
 */
function ClassBonusLine({ bonus, state }: { bonus: number; state: 'blocked' | 'approaching' }) {
  if (bonus <= 0) return null
  // The approaching banner carries its own bottom margin; tuck the line into
  // it so the note reads as part of the banner rather than a stray paragraph.
  const spacing = state === 'approaching' ? '-mt-3 mb-5' : 'mt-2'
  return (
    <p className={`${spacing} px-1 text-xs leading-relaxed text-[var(--ec-text-secondary)]`}>
      {classBonusNote(bonus, state)}
    </p>
  )
}

/**
 * Dashboard/mark/progress banner: enforce block (always) or approaching-limit (dismissible).
 */
export function BillingLimitBanner({ className = '' }: Props) {
  const [summary, setSummary] = useState<BillingSummaryClient | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/summary', { cache: 'no-store' })
      if (!res.ok) {
        setSummary(null)
        return
      }
      setSummary((await res.json()) as BillingSummaryClient)
    } catch {
      setSummary(null)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Storage can be blocked (private mode, site data off); the banner then
      // just is not remembered as dismissed.
      try {
        setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
      } catch {
        setDismissed(false)
      }
    }
    void load()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load])

  if (!summary?.signedIn) return null

  const blocked =
    summary.enforcement_mode === 'enforce' &&
    (summary.questions.blocked || summary.omni.blocked)

  const classBonus = classBonusFromSummary(summary)

  if (blocked) {
    return (
      <div className={className}>
        <BillingBlockedBanner summary={summary} />
        {summary.questions.blocked && <ClassBonusLine bonus={classBonus} state="blocked" />}
      </div>
    )
  }

  const focus = approachingFocus(summary)
  if (!focus || dismissed) return null

  const q = summary.questions
  const o = summary.omni

  return (
    <div className={className}>
      <ApproachingLimitBanner
        used={q.used}
        cap={q.cap}
        remaining={q.remaining}
        omniRemaining={o.remaining}
        omniUsed={o.used}
        omniCap={o.cap}
        focus={focus}
        onDismiss={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, '1')
          } catch {
            // Not remembered past this page; dismissing still works.
          }
          setDismissed(true)
        }}
      />
      {focus !== 'omni' && <ClassBonusLine bonus={classBonus} state="approaching" />}
    </div>
  )
}
