'use client'

import { useId, useState } from 'react'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { HONEYPOT_FIELD } from '@/lib/honeypot'

/** Mirrors SeatCardState in lib/teacher/seat-grant.ts (that module is server-only). */
export type SeatCardView =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'declined'; reason: string | null; reviewedAt: string | null }

type Props = {
  /** From seatCardState(): the page renders nothing at all for a verified teacher. */
  state: SeatCardView
  /** Marks a month a verified seat is worth — passed in; the cap is env-tunable. */
  teacherCap: number
  /** Marks a month they get until then. */
  freeCap: number
}

function formatDay(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/**
 * The ask for a verified teacher seat, in three states:
 *
 *   none      — leads with the gap ("you're marking on the free allowance"),
 *               because the teacher does not know they have a problem yet;
 *   pending   — quiet: they have done the only thing they can do;
 *   declined  — the reviewer's reason, verbatim, and "Apply again", because
 *               a decline with no way forward loses the teacher and the class.
 *
 * Posts to /api/teacher/seat-request; a new request after a decline opens a
 * fresh row (the unique index is on pending requests only).
 */
export function TeacherSeatRequestCard({ state, teacherCap, freeCap }: Props) {
  const [view, setView] = useState<SeatCardView>(state)
  const [open, setOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [classSize, setClassSize] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')
  const titleId = useId()

  const ready = schoolName.trim().length > 1 && schoolEmail.trim().includes('@')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/teacher/seat-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: schoolName.trim(),
          school_email: schoolEmail.trim(),
          role_title: roleTitle.trim() || undefined,
          class_size: classSize || undefined,
          [HONEYPOT_FIELD]: honeypot,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string }

      if (!res.ok) {
        setError(data.error || 'Could not send your request. Try again.')
        return
      }
      setView({ kind: 'pending' })
      setOpen(false)
      setAnnounce(
        data.status === 'approved'
          ? 'Your seat is already on — refresh the page.'
          : 'Request sent. We will email you when your seat is on.'
      )
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const live = (
    <p className="sr-only" role="status" aria-live="polite">
      {announce}
    </p>
  )

  if (view.kind === 'pending') {
    return (
      <section className="ms-teacher-seat ms-teacher-seat--pending" aria-labelledby={titleId}>
        {live}
        <p id={titleId} className="ec-eyebrow mb-1">
          Seat requested
        </p>
        <p className="ms-teacher-seat__lead">
          We&apos;re checking your school details. Seats are approved by a person, usually within a
          day — we&apos;ll email you the moment yours is on. Until then your own marking runs on the
          free allowance, and your classes work as normal.
        </p>
      </section>
    )
  }

  const declined = view.kind === 'declined' ? view : null
  const decidedOn = declined ? formatDay(declined.reviewedAt) : null

  return (
    <section
      className={`ms-teacher-seat${declined ? ' ms-teacher-seat--declined' : ''}`}
      aria-labelledby={titleId}
    >
      {live}
      <div className="mb-2 flex items-center gap-2">
        <p className="ec-eyebrow mb-0">Your teacher seat</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline ec-ink-stamp--crimson" aria-hidden>
          SEAT
        </span>
      </div>

      {declined ? (
        <>
          <h2 id={titleId} className="ms-teacher-seat__title">
            We couldn&apos;t verify your seat yet
          </h2>
          <blockquote className="ms-teacher-seat__reason">
            <cite>From the reviewer{decidedOn ? `, ${decidedOn}` : ''}</cite>
            {declined.reason?.trim() || 'We could not match the details to a school.'}
          </blockquote>
          <p className="ms-teacher-seat__lead">
            Apply again with that in mind — a school email address on your school&apos;s own domain is
            the quickest thing for us to check. Your classes and codes keep working meanwhile; your own
            marking stays on {freeCap} a month until the seat is on.
          </p>
        </>
      ) : (
        <>
          <h2 id={titleId} className="ms-teacher-seat__title">
            You&apos;re marking on the <em>free</em> allowance
          </h2>
          <p className="ms-teacher-seat__lead">
            That&apos;s {freeCap} marks a month — about a sixth of one class set. A verified teacher seat
            gives you <strong>{teacherCap} a month, free, for as long as you teach</strong>, and every
            student in your classes gets extra marks too. No card, no trial. We just need to know where
            you teach.
          </p>
        </>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ec-btn-primary ms-teacher-seat__cta"
        >
          {declined ? 'Apply again' : 'Request my seat'}
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            →
          </span>
        </button>
      ) : (
        <form onSubmit={submit} className="ms-teacher-start ms-teacher-seat__form" noValidate>
          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Which school do you teach at?"
            inputProps={{
              id: 'seat-school',
              type: 'text',
              value: schoolName,
              onChange: (e) => setSchoolName(e.target.value),
              disabled: saving,
              maxLength: 160,
              placeholder: 'e.g. Karachi Grammar School',
              className: 'ms-teacher-start__input',
              autoComplete: 'organization',
              required: true,
              // The teacher just pressed the button that revealed this form.
              autoFocus: true,
            }}
          />

          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Your school email"
            hint="This is what we check the seat against — a school domain is approved fastest."
            inputProps={{
              id: 'seat-email',
              type: 'email',
              value: schoolEmail,
              onChange: (e) => setSchoolEmail(e.target.value),
              disabled: saving,
              maxLength: 160,
              placeholder: 'you@school.edu',
              className: 'ms-teacher-start__input',
              autoComplete: 'email',
              required: true,
            }}
          />

          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Your role (optional)"
            inputProps={{
              id: 'seat-role',
              type: 'text',
              value: roleTitle,
              onChange: (e) => setRoleTitle(e.target.value),
              disabled: saving,
              maxLength: 120,
              placeholder: 'e.g. Head of Chemistry',
              className: 'ms-teacher-start__input',
              autoComplete: 'organization-title',
            }}
          />

          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="How many students do you teach? (optional)"
            inputProps={{
              id: 'seat-size',
              type: 'number',
              inputMode: 'numeric',
              min: 1,
              max: 2000,
              value: classSize,
              onChange: (e) => setClassSize(e.target.value),
              disabled: saving,
              placeholder: 'e.g. 60',
              className: 'ms-teacher-start__input',
            }}
          />

          {/* Honeypot — hidden from people, tempting to bots. */}
          <input
            type="text"
            name={HONEYPOT_FIELD}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error ? <FormErrorAlert message={error} className="ms-teacher-start__error" /> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={!ready || saving}
              aria-busy={saving || undefined}
              className="ec-btn-primary ms-teacher-start__submit sm:w-auto sm:px-8"
            >
              {saving ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError('')
              }}
              disabled={saving}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
            >
              Not now
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
