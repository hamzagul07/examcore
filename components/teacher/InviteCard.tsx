'use client'

import { useEffect, useState } from 'react'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { StableLabel } from '@/components/ui/StableLabel'

const FALLBACK_ORIGIN = 'https://markscheme.app'

interface InviteCardProps {
  classroom: {
    invite_code: string
  }
}

type CopyStatus = 'idle' | 'ok' | 'fail'

const STATUS_INDEX: Record<CopyStatus, number> = { idle: 0, ok: 1, fail: 2 }

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
              className="ec-btn-secondary min-h-[44px] min-w-[44px] px-2.5 py-2.5"
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
            {/* The confirmation lands beside the button that was pressed and fades
                before the state resets; the live region below announces it. */}
            {codeStatus === 'ok' ? (
              <span className="ms-teacher-flash" aria-hidden>
                <span className="ec-ink-stamp ec-ink-stamp--inline">OK</span>
                Invite code copied.
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
            Students enter this code at <span className="ec-text-brand">/join</span> or open the
            share link.
          </p>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            read it aloud — hyphens are optional
          </span>
          {codeStatus === 'fail' || linkStatus === 'fail' ? (
            <p className="ms-teacher-start__error ec-land mt-3" role="alert">
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
          className="ec-btn-primary inline-flex min-h-[44px] w-full items-center justify-center md:w-auto"
          aria-label={
            linkStatus === 'ok'
              ? 'Link copied'
              : linkStatus === 'fail'
                ? 'Copy link failed'
                : 'Copy share link'
          }
        >
          {/* Three labels, one width: the button must not jump as it confirms. */}
          <StableLabel
            active={STATUS_INDEX[linkStatus]}
            labels={[
              <>
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  URL
                </span>
                Copy share link
              </>,
              <>
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  OK
                </span>
                Link copied
              </>,
              <>
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  !
                </span>
                Couldn’t copy
              </>,
            ]}
          />
        </button>
      </div>
    </div>
  )
}
