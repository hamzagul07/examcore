'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { TeacherConfirmDialog } from '@/components/teacher/ClassroomSettingsForm'

const FALLBACK_ORIGIN = 'https://markscheme.app'

interface InviteCardProps {
  classroom: {
    invite_code: string
  }
  /**
   * Pass both to offer "New code" (class settings). The class page shows the
   * card without it: replacing a code is a deliberate act, done where the
   * consequences are spelled out.
   */
  classroomId?: string
  canRegenerate?: boolean
}

type CopyStatus = 'idle' | 'ok' | 'fail'

/**
 * The class invite: the code (grouped for reading aloud), copy code, copy
 * the /join link, and — in settings — "New code", which kills the old one at
 * once. Students already in the class are unaffected; only new joins need the
 * new code, which is exactly what a teacher whose code leaked wants.
 */
export function InviteCard({ classroom, classroomId, canRegenerate = false }: InviteCardProps) {
  const router = useRouter()
  const [code, setCode] = useState(classroom.invite_code)
  const [codeStatus, setCodeStatus] = useState<CopyStatus>('idle')
  const [linkStatus, setLinkStatus] = useState<CopyStatus>('idle')
  // Prefer the live origin so local / preview joins work; fall back for SSR.
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [announce, setAnnounce] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    setCode(classroom.invite_code)
  }, [classroom.invite_code])

  const shareUrl = `${origin}/join/${code}`

  // Grouped for reading aloud; the hyphen is cosmetic and the join form strips
  // it, so a student who types what they see still gets in.
  const displayCode = formatInviteCode(code)

  function flash(setter: (s: CopyStatus) => void, next: CopyStatus) {
    setter(next)
    window.setTimeout(() => setter('idle'), 2500)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
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

  async function regenerate() {
    if (!classroomId || regenerating) return
    setRegenerating(true)
    setRegenError('')
    try {
      const res = await fetch(`/api/teacher/classroom/${classroomId}/invite`, { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { invite_code?: string; error?: string }
      if (!res.ok || !data.invite_code) {
        setRegenError(data.error || 'Could not make a new code. Try again.')
        return
      }
      setCode(data.invite_code)
      setConfirming(false)
      setAnnounce(`New code ${formatInviteCode(data.invite_code)}. The old code no longer works.`)
      router.refresh()
    } catch {
      setRegenError('Could not reach the server. Check your connection and try again.')
    } finally {
      setRegenerating(false)
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
            : announce

  return (
    <div className="ms-teacher-invite">
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div className="min-w-0">
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
                codeStatus === 'ok' ? 'Code copied' : codeStatus === 'fail' ? 'Copy failed' : 'Copy invite code'
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
            Students enter this code at <span className="ec-text-brand">/join</span> or open the share
            link.
          </p>
          <span className="ms-teacher-desk-head__note" aria-hidden>
            read it aloud — hyphens are optional
          </span>
          {codeStatus === 'fail' || linkStatus === 'fail' ? (
            <p className="ms-teacher-start__error mt-3" role="alert">
              {liveMessage}
            </p>
          ) : (
            <p className="sr-only" role="status" aria-live="polite">
              {liveMessage}
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto">
          <button
            type="button"
            onClick={copyLink}
            className="ec-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 md:w-auto"
            aria-label={
              linkStatus === 'ok' ? 'Link copied' : linkStatus === 'fail' ? 'Copy link failed' : 'Copy share link'
            }
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
              {linkStatus === 'ok' ? 'OK' : linkStatus === 'fail' ? '!' : 'URL'}
            </span>
            {linkStatus === 'ok' ? 'Link copied' : linkStatus === 'fail' ? 'Couldn’t copy' : 'Copy share link'}
          </button>
          {canRegenerate && classroomId ? (
            <button
              type="button"
              onClick={() => {
                setRegenError('')
                setConfirming(true)
              }}
              className="ec-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-2 md:w-auto"
            >
              <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                NEW
              </span>
              New code
            </button>
          ) : null}
        </div>
      </div>

      {canRegenerate && classroomId ? (
        <TeacherConfirmDialog
          open={confirming}
          onClose={() => (regenerating ? undefined : setConfirming(false))}
          title="Replace the invite code?"
          confirmLabel="Make a new code"
          busyLabel="Making a new code…"
          busy={regenerating}
          error={regenError}
          tone="primary"
          onConfirm={() => void regenerate()}
        >
          <p className="ms-teacher-confirm__body">
            <strong>{displayCode}</strong> stops working straight away, so anyone who has it but has not
            joined yet will need the new one. Students already in the class stay in it.
          </p>
        </TeacherConfirmDialog>
      ) : null}
    </div>
  )
}
