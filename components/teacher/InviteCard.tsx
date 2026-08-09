'use client'

import { useEffect, useState } from 'react'
import { formatInviteCode } from '@/lib/teacher/invite-code'

const FALLBACK_ORIGIN = 'https://markscheme.app'

interface InviteCardProps {
  classroom: {
    invite_code: string
  }
}

type CopyStatus = 'idle' | 'ok' | 'fail'

export function InviteCard({ classroom }: InviteCardProps) {
  const [codeStatus, setCodeStatus] = useState<CopyStatus>('idle')
  const [linkStatus, setLinkStatus] = useState<CopyStatus>('idle')
  // Prefer the live origin so local / preview joins work; fall back for SSR.
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const shareUrl = `${origin}/join/${classroom.invite_code}`

  // Grouped for reading aloud; the hyphen is cosmetic and the join form strips
  // it, so a student who types what they see still gets in.
  const displayCode = formatInviteCode(classroom.invite_code)

  function flash(setter: (s: CopyStatus) => void, next: CopyStatus) {
    setter(next)
    window.setTimeout(() => setter('idle'), 2500)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(classroom.invite_code)
      flash(setCodeStatus, 'ok')
    } catch {
      flash(setCodeStatus, 'fail')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      flash(setLinkStatus, 'ok')
    } catch {
      flash(setLinkStatus, 'fail')
    }
  }

  const liveMessage =
    codeStatus === 'ok'
      ? 'Invite code copied.'
      : codeStatus === 'fail'
        ? 'Couldn’t copy — select the code manually.'
        : linkStatus === 'ok'
          ? 'Share link copied.'
          : linkStatus === 'fail'
            ? 'Couldn’t copy the link — select it from the address bar after opening /join.'
            : ''

  return (
    <div className="ms-teacher-invite">
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-label-tech mb-0">Invite students</span>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              JOIN
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-4xl font-bold tracking-widest ec-text-brand">
              {displayCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-2.5 transition-colors hover:bg-[var(--ec-brand-muted)]"
              title="Copy code"
              aria-label={
                codeStatus === 'ok'
                  ? 'Code copied'
                  : codeStatus === 'fail'
                    ? 'Copy failed'
                    : 'Copy invite code'
              }
            >
              <span
                className={`font-mono text-[11px] font-bold tracking-wide ${
                  codeStatus === 'ok'
                    ? 'ec-score-high'
                    : codeStatus === 'fail'
                      ? 'ec-score-low'
                      : 'text-[var(--ec-text-secondary)]'
                }`}
                aria-hidden
              >
                {codeStatus === 'ok' ? 'OK' : codeStatus === 'fail' ? '!' : 'CPY'}
              </span>
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
            Students enter this code at <span className="ec-text-brand">/join</span> or open the
            share link.
          </p>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            read it aloud — hyphens are optional
          </span>
          {codeStatus === 'fail' || linkStatus === 'fail' ? (
            <p className="ms-teacher-start__error mt-3" role="alert">
              {liveMessage}
            </p>
          ) : (
            <p className="sr-only" aria-live="polite">
              {liveMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={copyLink}
          className="ec-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 md:w-auto"
          aria-label={
            linkStatus === 'ok'
              ? 'Link copied'
              : linkStatus === 'fail'
                ? 'Copy link failed'
                : 'Copy share link'
          }
        >
          <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
            {linkStatus === 'ok' ? 'OK' : linkStatus === 'fail' ? '!' : 'URL'}
          </span>
          {linkStatus === 'ok'
            ? 'Link copied'
            : linkStatus === 'fail'
              ? 'Couldn’t copy'
              : 'Copy share link'}
        </button>
      </div>
    </div>
  )
}
