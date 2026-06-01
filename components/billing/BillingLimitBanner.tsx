'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApproachingLimitBanner } from '@/components/billing/ApproachingLimitBanner'
import { BillingBlockedBanner } from '@/components/billing/BillingBlockedBanner'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'

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
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
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

  if (blocked) {
    return (
      <div className={className}>
        <BillingBlockedBanner summary={summary} />
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
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
      />
    </div>
  )
}
