'use client'

import { useMemo, useState } from 'react'
import { createChallengeId } from '@/lib/seo/challenges'
import { ToolShareActions } from '@/components/tools/ToolShareActions'
import { buildToolSlipText } from '@/lib/tools/tool-slip'

export function QuizChallengeShare({
  title,
  score,
  total,
  quizHref,
}: {
  title: string
  score: number
  total: number
  quizHref: string
}) {
  const [copied, setCopied] = useState(false)
  const challengePath = useMemo(() => {
    const id = createChallengeId({
      title,
      score,
      total,
      quizHref,
      percentile: total > 0 ? Math.max(1, Math.round(100 - (score / total) * 100)) : undefined,
    })
    return `/challenge/${id}`
  }, [title, score, total, quizHref])

  const challengeUrl = `https://markscheme.app${challengePath}`

  const slip = buildToolSlipText([
    'MarkScheme · Quiz challenge',
    title,
    `Score: ${score}/${total}`,
    'Can you beat it?',
    challengeUrl,
  ])

  async function copyLink() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${challengePath}`
        : challengeUrl
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="ec-card ec-card--paper mt-6 border border-[var(--ec-border)] p-4 shadow-[var(--ec-shadow-hard,4px_4px_0_rgba(0,0,0,0.08))]">
      <span
        className="inline-grid h-6 min-w-6 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1.5 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
        aria-hidden
      >
        VS
      </span>
      <p className="ms-h3 mt-2" style={{ fontSize: '1.05rem' }}>
        You scored {score}/{total}
      </p>
      <p className="ms-body-2 mt-1">Challenge a friend — share your result.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="ec-btn-primary min-h-[44px]" onClick={() => void copyLink()}>
          {copied ? 'Link copied' : 'Copy challenge link'}
        </button>
      </div>
      <ToolShareActions
        title={`MarkScheme · ${title}`}
        url={challengeUrl}
        text={slip}
        copyLabel="Copy challenge"
      />
    </div>
  )
}
