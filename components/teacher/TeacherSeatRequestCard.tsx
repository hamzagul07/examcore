'use client'

import { useState } from 'react'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { HONEYPOT_FIELD } from '@/lib/honeypot'

type Props = {
  /** Whether this teacher already has an open request (from the server). */
  initialPending: boolean
  /** Marks a month a verified seat is worth — passed in; the cap is env-tunable. */
  teacherCap: number
  /** Marks a month they get until then. */
  freeCap: number
}

/**
 * The ask for a verified teacher seat.
 *
 * Shown to a teacher who has set up a classroom but holds no seat — which,
 * before this existed, was every teacher on the product. They had been told
 * marking their class was free for them, and were silently on the 5-a-month
 * free tier. The card leads with that gap rather than with a form, because the
 * teacher does not know they have a problem yet.
 */
export function TeacherSeatRequestCard({
  initialPending,
  teacherCap,
  freeCap,
}: Props) {
  const [pending, setPending] = useState(initialPending)
  const [open, setOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [classSize, setClassSize] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Could not send your request. Try again.')
        return
      }
      setPending(true)
      setOpen(false)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (pending) {
    return (
      <section className="ms-teacher-seat ms-teacher-seat--pending">
        <p className="ec-eyebrow mb-1">Seat requested</p>
        <p className="ms-teacher-seat__lead">
          We&apos;re checking your school details. Seats are approved by a human, usually
          within a day — we&apos;ll email you the moment yours is on. Until then your
          marking runs on the free allowance.
        </p>
      </section>
    )
  }

  return (
    <section className="ms-teacher-seat">
      <div className="mb-2 flex items-center gap-2">
        <p className="ec-eyebrow mb-0">Your teacher seat</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          SEAT
        </span>
      </div>

      <h2 className="ms-teacher-seat__title">
        You&apos;re marking on the <em>free</em> allowance
      </h2>
      <p className="ms-teacher-seat__lead">
        That&apos;s {freeCap} marks a month — about a sixth of one class set. A verified
        teacher seat gives you <strong>{teacherCap} a month, free, for as long as you
        teach</strong>. No card, no trial. We just need to know where you teach.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ec-btn-primary ms-teacher-seat__cta"
        >
          Request my seat
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </button>
      ) : (
        <form onSubmit={submit} className="ms-teacher-start ms-teacher-seat__form">
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

          {error ? (
            <FormErrorAlert message={error} className="ms-teacher-start__error" />
          ) : null}

          <button
            type="submit"
            disabled={!ready || saving}
            aria-busy={saving || undefined}
            className="ec-btn-primary ms-teacher-start__submit"
          >
            {saving ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}
    </section>
  )
}
