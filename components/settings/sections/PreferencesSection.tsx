'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InlineSavingPulse } from '@/components/ui/ButtonLoadingState'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'

type Props = {
  initialExamReminders: boolean
  initialProductUpdates: boolean
  initialCommunityReplies: boolean
  initialCommunityDigest: boolean
  initialCommunityThreads: boolean
  initialReviewDigest: boolean
  initialWeeklyReport: boolean
  initialMarkReady: boolean
}

type PrefField =
  | 'email_exam_reminders'
  | 'email_product_updates'
  | 'email_community_replies'
  | 'email_community_digest'
  | 'email_community_threads'
  | 'email_review_digest'
  | 'email_weekly_report'
  | 'email_mark_ready'

type SavingKey =
  | 'exam'
  | 'product'
  | 'communityReplies'
  | 'communityDigest'
  | 'communityThreads'
  | 'reviewDigest'
  | 'weeklyReport'
  | 'markReady'

/**
 * Feedback for the row that last changed. "Saved" lands, holds, then fades;
 * an error stays put until the next change anywhere in the section.
 */
type RowStatus =
  | { key: SavingKey; kind: 'saved'; phase: 'shown' | 'leaving'; nonce: number }
  | { key: SavingKey; kind: 'error'; message: string }

/** How long the "Saved" stamp holds before it fades (ms). */
const SAVED_HOLD_MS = 1800
/** The fade itself — keep in step with `--ec-dur-menu`. */
const SAVED_FADE_MS = 200

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

function PreferenceToggle({
  title,
  description,
  ariaLabel,
  checked,
  saving,
  status,
  onChange,
}: {
  title: ReactNode
  description: ReactNode
  ariaLabel: string
  checked: boolean
  saving: boolean
  status: RowStatus | null
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
          {description}
        </span>
        {status?.kind === 'error' && (
          <span
            role="alert"
            className="mt-1.5 block font-mono text-[11px] leading-snug text-[var(--ec-error)]"
          >
            {status.message}
          </span>
        )}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={saving}
          className="sr-only"
          aria-label={ariaLabel}
        />
        <span
          className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
            checked
              ? 'ec-select-active'
              : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full transition-transform ${
              checked
                ? 'translate-x-5 bg-[var(--ec-brand)]'
                : 'translate-x-0 bg-[var(--ec-text-secondary)]'
            }`}
          />
        </span>
        {/* Status lane: tucked under the switch, inside the row's own 56px,
            so neither the pulse nor the stamp reflows the copy or leaves the card. */}
        <span
          className="pointer-events-none absolute right-0 top-[calc(100%+4px)] flex h-[22px] items-center justify-end"
          aria-hidden
        >
          {saving && <InlineSavingPulse className="mr-[18px]" />}
          {status?.kind === 'saved' && (
            <span
              data-state={status.phase}
              className="inline-flex transition-opacity duration-[var(--ec-dur-menu)] ease-[var(--ec-ease-out)] data-[state=leaving]:opacity-0 motion-reduce:transition-none"
            >
              {/* `.ec-land` animates transform, so it lives on its own layer:
                  the stamp underneath keeps its -3deg tilt. */}
              <span className="ec-land inline-flex">
                <span className="ec-ink-stamp ec-ink-stamp--inline">✓ Saved</span>
              </span>
            </span>
          )}
        </span>
      </span>
    </label>
  )
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
}: Props) {
  const [examReminders, setExamReminders] = useState(initialExamReminders)
  const [productUpdates, setProductUpdates] = useState(initialProductUpdates)
  const [communityReplies, setCommunityReplies] = useState(initialCommunityReplies)
  const [communityDigest, setCommunityDigest] = useState(initialCommunityDigest)
  const [communityThreads, setCommunityThreads] = useState(initialCommunityThreads)
  const [reviewDigest, setReviewDigest] = useState(initialReviewDigest)
  const [weeklyReport, setWeeklyReport] = useState(initialWeeklyReport)
  const [markReady, setMarkReady] = useState(initialMarkReady)
  const [saving, setSaving] = useState<SavingKey | null>(null)
  const [rowStatus, setRowStatus] = useState<RowStatus | null>(null)
  const statusNonce = useRef(0)

  // "Saved" holds for a beat, fades, then leaves the DOM. A newer save (or a
  // cleared status) changes the nonce, which cancels the previous timers.
  const savedNonce = rowStatus?.kind === 'saved' ? rowStatus.nonce : null
  useEffect(() => {
    if (savedNonce === null) return
    const fade = prefersReducedMotion() ? 0 : SAVED_FADE_MS
    const leave = window.setTimeout(() => {
      setRowStatus((s) =>
        s?.kind === 'saved' && s.nonce === savedNonce ? { ...s, phase: 'leaving' } : s
      )
    }, SAVED_HOLD_MS)
    const clear = window.setTimeout(() => {
      setRowStatus((s) => (s?.kind === 'saved' && s.nonce === savedNonce ? null : s))
    }, SAVED_HOLD_MS + fade)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(clear)
    }
  }, [savedNonce])

  async function savePreference(field: PrefField, value: boolean, savingKey: SavingKey) {
    setSaving(savingKey)
    setRowStatus(null)

    const res = await fetch('/api/account/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })

    setSaving(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setRowStatus({
        key: savingKey,
        kind: 'error',
        message: data?.error || 'Could not save preference.',
      })
      if (field === 'email_exam_reminders') setExamReminders(!value)
      else if (field === 'email_product_updates') setProductUpdates(!value)
      else if (field === 'email_community_replies') setCommunityReplies(!value)
      else if (field === 'email_community_digest') setCommunityDigest(!value)
      else if (field === 'email_community_threads') setCommunityThreads(!value)
      else if (field === 'email_review_digest') setReviewDigest(!value)
      else if (field === 'email_mark_ready') setMarkReady(!value)
      else setWeeklyReport(!value)
      return
    }

    statusNonce.current += 1
    setRowStatus({ key: savingKey, kind: 'saved', phase: 'shown', nonce: statusNonce.current })
  }

  const statusFor = (key: SavingKey) => (rowStatus?.key === key ? rowStatus : null)

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
          <PreferenceToggle
            title="Exam countdown and study-plan check-ins"
            description={
              <>
                Gentle nudges as your exam date approaches — and, once you have a study plan, one short email on study mornings with the day&apos;s blocks.
              </>
            }
            ariaLabel="Exam countdown reminders"
            checked={examReminders}
            saving={saving === 'exam'}
            status={statusFor('exam')}
            onChange={(checked) => {
              setExamReminders(checked)
              void savePreference('email_exam_reminders', checked, 'exam')
            }}
          />

          <PreferenceToggle
            title="Product updates"
            description="New subjects, features, and usage-limit notices."
            ariaLabel="Product updates"
            checked={productUpdates}
            saving={saving === 'product'}
            status={statusFor('product')}
            onChange={(checked) => {
              setProductUpdates(checked)
              void savePreference('email_product_updates', checked, 'product')
            }}
          />

          <PreferenceToggle
            title="Exam Room replies"
            description="Email when someone comments on your post, replies to you, or @mentions you."
            ariaLabel="Exam Room reply emails"
            checked={communityReplies}
            saving={saving === 'communityReplies'}
            status={statusFor('communityReplies')}
            onChange={(checked) => {
              setCommunityReplies(checked)
              void savePreference('email_community_replies', checked, 'communityReplies')
            }}
          />

          <PreferenceToggle
            title="Exam Room thread activity"
            description="Email when someone replies anywhere in a thread on your post (not just direct replies)."
            ariaLabel="Exam Room thread activity emails"
            checked={communityThreads}
            saving={saving === 'communityThreads'}
            status={statusFor('communityThreads')}
            onChange={(checked) => {
              setCommunityThreads(checked)
              void savePreference('email_community_threads', checked, 'communityThreads')
            }}
          />

          <PreferenceToggle
            title="Exam Room weekly digest"
            description="Trending discussions in your subjects — sent on Mondays."
            ariaLabel="Exam Room weekly digest"
            checked={communityDigest}
            saving={saving === 'communityDigest'}
            status={statusFor('communityDigest')}
            onChange={(checked) => {
              setCommunityDigest(checked)
              void savePreference('email_community_digest', checked, 'communityDigest')
            }}
          />

          <PreferenceToggle
            title="Review reminders"
            description={
              <>
                A weekly nudge when your spaced-review topics are due — keeps your weak
                spots sharp.
              </>
            }
            ariaLabel="Review reminders"
            checked={reviewDigest}
            saving={saving === 'reviewDigest'}
            status={statusFor('reviewDigest')}
            onChange={(checked) => {
              setReviewDigest(checked)
              void savePreference('email_review_digest', checked, 'reviewDigest')
            }}
          />

          <PreferenceToggle
            title="Weekly progress report"
            description={
              <>
                A private examiner-style summary each week — your marks, grade
                trajectory, and the topic to drill next. Premium.
              </>
            }
            ariaLabel="Weekly progress report"
            checked={weeklyReport}
            saving={saving === 'weeklyReport'}
            status={statusFor('weeklyReport')}
            onChange={(checked) => {
              setWeeklyReport(checked)
              void savePreference('email_weekly_report', checked, 'weeklyReport')
            }}
          />

          <PreferenceToggle
            title="Marking finished"
            description={
              <>
                Marking takes a few minutes, so you can close the tab and get on
                with something. We&apos;ll email your marks when they land — only
                if you left before they were ready.
              </>
            }
            ariaLabel="Marking finished"
            checked={markReady}
            saving={saving === 'markReady'}
            status={statusFor('markReady')}
            onChange={(checked) => {
              setMarkReady(checked)
              void savePreference('email_mark_ready', checked, 'markReady')
            }}
          />
        </div>
      </SettingsSectionCard>

      {/* Screen readers hear the old section-level copy; sighted users get the
          stamp beside the row. Errors announce from the row itself (role="alert"). */}
      <span role="status" aria-live="polite" className="sr-only">
        {rowStatus?.kind === 'saved' ? 'Preferences saved.' : ''}
      </span>
    </div>
  )
}
