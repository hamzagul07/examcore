'use client'

import { useState } from 'react'
import { InlineSavingPulse } from '@/components/ui/ButtonLoadingState'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'

type Props = {
  initialExamReminders: boolean
  initialProductUpdates: boolean
  initialCommunityReplies: boolean
  initialCommunityDigest: boolean
  initialCommunityThreads: boolean
  initialReviewDigest: boolean
  initialWeeklyReport: boolean
  initialMarkReady: boolean
  initialAssignments: boolean
  initialTeacherDigest: boolean
  /** Teachers get the Sunday class digest toggle instead of the set emails. */
  isTeacher: boolean
}

/** The user_profiles columns PATCH /api/account/preferences accepts. */
type PrefField =
  | 'email_exam_reminders'
  | 'email_product_updates'
  | 'email_community_replies'
  | 'email_community_digest'
  | 'email_community_threads'
  | 'email_review_digest'
  | 'email_weekly_report'
  | 'email_mark_ready'
  | 'email_assignments'
  | 'email_teacher_digest'

type PrefRow = {
  field: PrefField
  title: string
  description: string
  ariaLabel: string
}

const STUDY_ROWS: readonly PrefRow[] = [
  {
    field: 'email_exam_reminders',
    title: 'Exam countdown and study-plan check-ins',
    description:
      'Gentle nudges as your exam date approaches — and, once you have a study plan, one short email on study mornings with the day’s blocks.',
    ariaLabel: 'Exam countdown reminders',
  },
  {
    field: 'email_product_updates',
    title: 'Product updates',
    description: 'New subjects, features, and usage-limit notices.',
    ariaLabel: 'Product updates',
  },
  {
    field: 'email_community_replies',
    title: 'Exam Room replies',
    description: 'Email when someone comments on your post, replies to you, or @mentions you.',
    ariaLabel: 'Exam Room reply emails',
  },
  {
    field: 'email_community_threads',
    title: 'Exam Room thread activity',
    description: 'Email when someone replies anywhere in a thread on your post (not just direct replies).',
    ariaLabel: 'Exam Room thread activity emails',
  },
  {
    field: 'email_community_digest',
    title: 'Exam Room weekly digest',
    description: 'Trending discussions in your subjects — sent on Mondays.',
    ariaLabel: 'Exam Room weekly digest',
  },
  {
    field: 'email_review_digest',
    title: 'Review reminders',
    description: 'A weekly nudge when your spaced-review topics are due — keeps your weak spots sharp.',
    ariaLabel: 'Review reminders',
  },
  {
    field: 'email_weekly_report',
    title: 'Weekly progress report',
    description:
      'A private examiner-style summary each week — your marks, grade trajectory, and the topic to drill next. Premium.',
    ariaLabel: 'Weekly progress report',
  },
  {
    field: 'email_mark_ready',
    title: 'Marking finished',
    description:
      'Marking takes a few minutes, so you can close the tab and get on with something. We’ll email your marks when they land — only if you left before they were ready.',
    ariaLabel: 'Marking finished',
  },
]

/** For students in a teacher's class (the unsubscribe link in those emails lands here). */
const ASSIGNMENTS_ROW: PrefRow = {
  field: 'email_assignments',
  title: 'Emails about work your teacher sets',
  description:
    'When your teacher sets work, a reminder when it’s nearly due, and when they re-mark your work or leave you a note. You still see all of it in the app.',
  ariaLabel: 'Emails about work your teacher sets',
}

/** Teachers only (the unsubscribe link in the digest lands here). */
const TEACHER_DIGEST_ROW: PrefRow = {
  field: 'email_teacher_digest',
  title: 'Sunday class digest',
  description:
    'One email on Sunday afternoon: who handed in, who is late, the gap to reteach, and scripts waiting for review, class by class.',
  ariaLabel: 'Sunday class digest',
}

export function PreferencesSection({
  initialExamReminders,
  initialProductUpdates,
  initialCommunityReplies,
  initialCommunityDigest,
  initialCommunityThreads,
  initialReviewDigest,
  initialWeeklyReport,
  initialMarkReady,
  initialAssignments,
  initialTeacherDigest,
  isTeacher,
}: Props) {
  const [values, setValues] = useState<Record<PrefField, boolean>>({
    email_exam_reminders: initialExamReminders,
    email_product_updates: initialProductUpdates,
    email_community_replies: initialCommunityReplies,
    email_community_digest: initialCommunityDigest,
    email_community_threads: initialCommunityThreads,
    email_review_digest: initialReviewDigest,
    email_weekly_report: initialWeeklyReport,
    email_mark_ready: initialMarkReady,
    email_assignments: initialAssignments,
    email_teacher_digest: initialTeacherDigest,
  })
  const [saving, setSaving] = useState<PrefField | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  function setValue(field: PrefField, value: boolean) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function savePreference(field: PrefField, value: boolean) {
    setValue(field, value)
    setSaving(field)
    setErrorMsg('')
    setSuccessMsg('')

    let ok = false
    let message = 'Could not save preference.'
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      ok = res.ok
      if (!ok) {
        const data = await res.json().catch(() => ({}))
        if (typeof data?.error === 'string' && data.error) message = data.error
      }
    } catch {
      message = 'Could not reach the server. Check your connection and try again.'
    }

    setSaving(null)
    if (!ok) {
      // Put the switch back: it must show what is stored, not what was asked.
      setValue(field, !value)
      setErrorMsg(message)
      return
    }
    setSuccessMsg('Preferences saved.')
  }

  const rows: PrefRow[] = [...STUDY_ROWS, isTeacher ? TEACHER_DIGEST_ROW : ASSIGNMENTS_ROW]

  return (
    <div className="ms-prefs-section space-y-6">
      <SettingsSectionCard
        title="Appearance"
        description="Choose how MarkScheme looks on your device."
      >
        <p className="label-overline mb-3">Theme</p>
        <ThemeSwitcher />
        <p className="text-caption mt-4">
          Late Night is our default dark workspace. Zen is a warm sand palette for
          daytime study.
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard title="Motion">
        <p className="text-body">
          Animations follow your system&apos;s reduced motion preference. Update in
          your OS settings to change.
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Email notifications"
        description="Optional — we only email when you opt in."
      >
        <div className="space-y-4">
          {rows.map((row) => (
            <PreferenceToggle
              key={row.field}
              row={row}
              checked={values[row.field]}
              saving={saving === row.field}
              onChange={(next) => void savePreference(row.field, next)}
            />
          ))}
        </div>
      </SettingsSectionCard>

      <div aria-live="polite">
        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}
      </div>
    </div>
  )
}

function PreferenceToggle({
  row,
  checked,
  saving,
  onChange,
}: {
  row: PrefRow
  checked: boolean
  saving: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">{row.title}</span>
        <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">{row.description}</span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={saving}
          className="peer sr-only"
          aria-label={row.ariaLabel}
        />
        {/* The checkbox is visually hidden, so the track shows its keyboard focus. */}
        <span
          className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ec-brand)] ${
            checked ? 'ec-select-active' : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full transition-transform ${
              checked ? 'translate-x-5 bg-[var(--ec-brand)]' : 'translate-x-0 bg-[var(--ec-text-secondary)]'
            }`}
          />
        </span>
        {saving && <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />}
      </span>
    </label>
  )
}
