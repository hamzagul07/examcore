'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'

const DISMISS_KEY = 'ms-max-vault-guide-dismissed'

const FEATURES = [
  {
    key: 'yours',
    title: 'Built especially for you',
    body: 'This Vault is your private Max desk — not a generic resource dump. Packs, diagrams, and coach notes follow your subjects and your marks.',
  },
  {
    key: 'grows',
    title: 'It gets sharper as you study',
    body: 'Courses start from the full syllabus. As you mark questions and expose weak topics, Vault rebuilds your path around those gaps so you get stronger where it counts.',
  },
  {
    key: 'diagrams',
    title: 'Learn with live diagrams',
    body: 'Open Concept Cinema and lesson pads — ideas move on screen instead of sitting as static textbook figures.',
  },
  {
    key: 'qbank',
    title: 'Sit a question, then mark the answer',
    body: 'Each subject gets its own desk. For CAIE: open the question, work it, then Mark — we lock the paper so you only submit your answer against the official scheme.',
  },
  {
    key: 'videos',
    title: 'Videos coming soon',
    body: 'Prefer watching when reading feels heavy? A Max video desk is on the way for the same hard topics.',
  },
  {
    key: 'more',
    title: 'More Max exclusives',
    body: 'Sprint checklists, full-marks models to beat, weekly coach inbox, priority marking, and community hooks — all on this page for you to use.',
  },
] as const

/**
 * Orients Max members: Vault is personal, adapts with marks, diagrams live, videos soon.
 */
export function MaxVaultGuide({
  subjectCode,
  hasWeakLessons,
}: {
  subjectCode: string | null
  hasWeakLessons: boolean
}) {
  const [dismissed, setDismissed] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
    setReady(true)
  }, [])

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const restore = () => {
    try {
      window.localStorage.removeItem(DISMISS_KEY)
    } catch {
      /* ignore */
    }
    setDismissed(false)
  }

  if (!ready) return null

  if (dismissed) {
    return (
      <p className="ms-vault__guide-restore text-caption mb-6">
        <button type="button" className="ec-link font-semibold" onClick={restore}>
          Show what&apos;s in your Max Vault
        </button>
      </p>
    )
  }

  return (
    <section className="ms-vault__section" aria-labelledby="ms-vault-guide-title">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          GO
        </span>
        <p className="ec-eyebrow mb-0">Max · start here</p>
        <h2
          id="ms-vault-guide-title"
          className="m-0 text-lg font-bold text-[var(--ec-text-primary)]"
        >
          Your Vault is built for you — use everything on this page
        </h2>
      </div>

      <div className="ms-vault__guide">
        <div className="ms-vault__guide-intro">
          <div className="flex flex-wrap gap-2">
            <MaxBadge label="Max exclusive" />
            <MaxBadge label="Personal desk" />
            {hasWeakLessons ? (
              <MaxBadge label="Adapting to your marks" />
            ) : (
              <MaxBadge label="Gets smarter as you mark" />
            )}
          </div>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Scroll this Vault and open each block. Concept Cinema, course paths, sprint
            packs, and coach notes are already yours — they tighten around your weak
            topics every time you mark.
          </p>
        </div>

        <ul className="ms-vault__guide-list">
          {FEATURES.map((f) => (
            <li key={f.key} className="ms-vault__guide-item">
              <h3 className="ms-vault__guide-item-title">{f.title}</h3>
              <p className="ms-vault__guide-item-body">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="ms-vault__guide-actions">
          <Link href="/mark" className="ec-btn-primary text-sm">
            Mark a question — sharpen your Vault
          </Link>
          {subjectCode ? (
            <Link
              href={`/courses/${encodeURIComponent(subjectCode)}`}
              className="ec-btn-ghost text-sm"
            >
              Open courses with diagrams
            </Link>
          ) : (
            <Link href="/courses" className="ec-btn-ghost text-sm">
              Open courses with diagrams
            </Link>
          )}
          <button type="button" className="ec-btn-ghost text-sm" onClick={dismiss}>
            Got it — hide this
          </button>
        </div>
      </div>
    </section>
  )
}
