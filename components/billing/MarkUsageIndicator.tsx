'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'
import {
  questionUsageMessage,
  wholePaperUsageMessage,
} from '@/lib/billing/question-copy'

type Props = {
  variant: 'single' | 'whole_paper'
  summary?: BillingSummaryClient | null
  className?: string
}

export function MarkUsageIndicator({ variant, summary: externalSummary, className = '' }: Props) {
  const [internalSummary, setInternalSummary] = useState<BillingSummaryClient | null>(null)
  const summary = externalSummary ?? internalSummary

  const load = useCallback(async () => {
    if (externalSummary !== undefined) return
    try {
      const res = await fetch('/api/billing/summary', { cache: 'no-store' })
      if (!res.ok) {
        setInternalSummary(null)
        return
      }
      setInternalSummary((await res.json()) as BillingSummaryClient)
    } catch {
      setInternalSummary(null)
    }
  }, [externalSummary])

  useEffect(() => {
    void load()
    if (externalSummary !== undefined) return
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load, externalSummary])

  if (!summary?.signedIn) return null

  if (variant === 'whole_paper') {
    const q = summary.questions
    const tone =
      q.blocked && summary.enforcement_mode === 'enforce'
        ? 'text-[var(--ec-error,#f87171)]'
        : q.warning || q.remaining <= Math.ceil(q.cap * 0.2)
          ? 'text-[var(--ec-warning,#fbbf24)]'
          : 'text-[var(--ec-text-secondary)]'
    return (
      <p className={`text-sm leading-relaxed ${tone} ${className}`}>
        {wholePaperUsageMessage(summary)}
      </p>
    )
  }

  const { text, tone, disableSubmit } = questionUsageMessage(summary)
  const toneClass =
    tone === 'error'
      ? 'text-[var(--ec-error,#f87171)]'
      : tone === 'warning'
        ? 'text-[var(--ec-warning,#fbbf24)]'
        : 'text-[var(--ec-text-secondary)]'

  return (
    <div className={`space-y-2 ${className}`}>
      <p className={`text-sm leading-relaxed ${toneClass}`}>{text}</p>
      {disableSubmit && (
        <p className="text-sm text-[var(--ec-text-secondary)]">
          <Link href="/pricing#credits" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Top up credits
          </Link>
          {' · '}
          <Link href="/pricing" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Upgrade plan
          </Link>
        </p>
      )}
    </div>
  )
}
