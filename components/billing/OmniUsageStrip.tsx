'use client'

import { useCallback, useEffect, useState } from 'react'
import { omniUsageMessage, type BillingSummaryClient } from '@/lib/billing/question-copy'

type Props = {
  className?: string
}

/** Inline Omni quota hint above the chat input (warn/enforce modes only). */
export function OmniUsageStrip({ className = '' }: Props) {
  const [summary, setSummary] = useState<BillingSummaryClient | null>(null)

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
    void load()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load])

  if (!summary?.signedIn || summary.enforcement_mode === 'off') return null

  const { text, tone } = omniUsageMessage(summary)
  if (!text) return null

  const toneClass =
    tone === 'error'
      ? 'ec-score-low'
      : tone === 'warning'
        ? 'ec-score-mid'
        : 'text-[var(--ec-text-secondary)]'

  return (
    <p className={`px-5 pt-3 text-xs leading-relaxed ${toneClass} ${className}`}>
      {text}
    </p>
  )
}

export function useOmniSubmitBlocked(): boolean {
  const [blocked, setBlocked] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/summary', { cache: 'no-store' })
      if (!res.ok) {
        setBlocked(false)
        return
      }
      const summary = (await res.json()) as BillingSummaryClient
      setBlocked(omniUsageMessage(summary).disableSubmit)
    } catch {
      setBlocked(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load])

  return blocked
}
