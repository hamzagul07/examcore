'use client'

import { useMemo, useState } from 'react'
import { createChallengeId } from '@/lib/seo/challenges'

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

  async function copyLink() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${challengePath}`
        : challengePath
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="ec-card mt-6 p-4">
      <p className="ms-h3" style={{ fontSize: '1.05rem' }}>
        You scored {score}/{total}
      </p>
      <p className="ms-body-2 mt-1">Challenge a friend — share your result.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="ec-btn-primary min-h-[44px]" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy challenge link'}
        </button>
        <a
          className="ec-btn-ghost min-h-[44px]"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `Can you beat my ${score}/${total} on ${title}?`
          )}&url=${encodeURIComponent(
            typeof window !== 'undefined'
              ? `${window.location.origin}${challengePath}`
              : challengePath
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share
        </a>
      </div>
    </div>
  )
}
