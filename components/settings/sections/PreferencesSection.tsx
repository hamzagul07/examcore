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
}

export function PreferencesSection({
  initialExamReminders,
  initialProductUpdates,
  initialCommunityReplies,
  initialCommunityDigest,
  initialCommunityThreads,
}: Props) {
  const [examReminders, setExamReminders] = useState(initialExamReminders)
  const [productUpdates, setProductUpdates] = useState(initialProductUpdates)
  const [communityReplies, setCommunityReplies] = useState(initialCommunityReplies)
  const [communityDigest, setCommunityDigest] = useState(initialCommunityDigest)
  const [communityThreads, setCommunityThreads] = useState(initialCommunityThreads)
  const [saving, setSaving] = useState<
    'exam' | 'product' | 'communityReplies' | 'communityDigest' | 'communityThreads' | null
  >(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function savePreference(
    field:
      | 'email_exam_reminders'
      | 'email_product_updates'
      | 'email_community_replies'
      | 'email_community_digest'
      | 'email_community_threads',
    value: boolean,
    savingKey: 'exam' | 'product' | 'communityReplies' | 'communityDigest' | 'communityThreads'
  ) {
    setSaving(savingKey)
    setErrorMsg('')
    setSuccessMsg('')

    const res = await fetch('/api/account/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })

    setSaving(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not save preference.')
      if (field === 'email_exam_reminders') setExamReminders(!value)
      else if (field === 'email_product_updates') setProductUpdates(!value)
      else if (field === 'email_community_replies') setCommunityReplies(!value)
      else if (field === 'email_community_digest') setCommunityDigest(!value)
      else setCommunityThreads(!value)
      return
    }

    setSuccessMsg('Preferences saved.')
  }

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
          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Exam countdown reminders
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                Gentle nudges as your exam date approaches.
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={examReminders}
                onChange={(e) => {
                  setExamReminders(e.target.checked)
                  void savePreference(
                    'email_exam_reminders',
                    e.target.checked,
                    'exam'
                  )
                }}
                disabled={saving === 'exam'}
                className="sr-only"
                aria-label="Exam countdown reminders"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                  examReminders
                    ? 'ec-select-active'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition-transform ${
                    examReminders
                      ? 'translate-x-5 bg-[var(--ec-brand)]'
                      : 'translate-x-0 bg-[var(--ec-text-secondary)]'
                  }`}
                />
              </span>
              {saving === 'exam' && (
                <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />
              )}
            </span>
          </label>

          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Product updates
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                New subjects, features, and usage-limit notices.
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={productUpdates}
                onChange={(e) => {
                  setProductUpdates(e.target.checked)
                  void savePreference(
                    'email_product_updates',
                    e.target.checked,
                    'product'
                  )
                }}
                disabled={saving === 'product'}
                className="sr-only"
                aria-label="Product updates"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                  productUpdates
                    ? 'ec-select-active'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition-transform ${
                    productUpdates
                      ? 'translate-x-5 bg-[var(--ec-brand)]'
                      : 'translate-x-0 bg-[var(--ec-text-secondary)]'
                  }`}
                />
              </span>
              {saving === 'product' && (
                <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />
              )}
            </span>
          </label>

          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Exam Room replies
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                Email when someone comments on your post, replies to you, or @mentions you.
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={communityReplies}
                onChange={(e) => {
                  setCommunityReplies(e.target.checked)
                  void savePreference(
                    'email_community_replies',
                    e.target.checked,
                    'communityReplies'
                  )
                }}
                disabled={saving === 'communityReplies'}
                className="sr-only"
                aria-label="Exam Room reply emails"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                  communityReplies
                    ? 'ec-select-active'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition-transform ${
                    communityReplies
                      ? 'translate-x-5 bg-[var(--ec-brand)]'
                      : 'translate-x-0 bg-[var(--ec-text-secondary)]'
                  }`}
                />
              </span>
              {saving === 'communityReplies' && (
                <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />
              )}
            </span>
          </label>

          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Exam Room thread activity
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                Email when someone replies anywhere in a thread on your post (not just direct replies).
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={communityThreads}
                onChange={(e) => {
                  setCommunityThreads(e.target.checked)
                  void savePreference(
                    'email_community_threads',
                    e.target.checked,
                    'communityThreads'
                  )
                }}
                disabled={saving === 'communityThreads'}
                className="sr-only"
                aria-label="Exam Room thread activity emails"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                  communityThreads
                    ? 'ec-select-active'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition-transform ${
                    communityThreads
                      ? 'translate-x-5 bg-[var(--ec-brand)]'
                      : 'translate-x-0 bg-[var(--ec-text-secondary)]'
                  }`}
                />
              </span>
              {saving === 'communityThreads' && (
                <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />
              )}
            </span>
          </label>

          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Exam Room weekly digest
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                Trending discussions in your subjects — sent on Mondays.
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={communityDigest}
                onChange={(e) => {
                  setCommunityDigest(e.target.checked)
                  void savePreference(
                    'email_community_digest',
                    e.target.checked,
                    'communityDigest'
                  )
                }}
                disabled={saving === 'communityDigest'}
                className="sr-only"
                aria-label="Exam Room weekly digest"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                  communityDigest
                    ? 'ec-select-active'
                    : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition-transform ${
                    communityDigest
                      ? 'translate-x-5 bg-[var(--ec-brand)]'
                      : 'translate-x-0 bg-[var(--ec-text-secondary)]'
                  }`}
                />
              </span>
              {saving === 'communityDigest' && (
                <InlineSavingPulse className="absolute -right-7 top-1/2 -translate-y-1/2" />
              )}
            </span>
          </label>
        </div>
      </SettingsSectionCard>

      {errorMsg && <ErrorBox message={errorMsg} />}
      {successMsg && <SuccessBox message={successMsg} />}
    </div>
  )
}
