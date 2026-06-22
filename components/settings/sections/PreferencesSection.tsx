'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'

type Props = {
  initialExamReminders: boolean
  initialProductUpdates: boolean
  initialCommunityReplies: boolean
  initialCommunityDigest: boolean
}

export function PreferencesSection({
  initialExamReminders,
  initialProductUpdates,
  initialCommunityReplies,
  initialCommunityDigest,
}: Props) {
  const [examReminders, setExamReminders] = useState(initialExamReminders)
  const [productUpdates, setProductUpdates] = useState(initialProductUpdates)
  const [communityReplies, setCommunityReplies] = useState(initialCommunityReplies)
  const [communityDigest, setCommunityDigest] = useState(initialCommunityDigest)
  const [saving, setSaving] = useState<'exam' | 'product' | 'communityReplies' | 'communityDigest' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function savePreference(
    field:
      | 'email_exam_reminders'
      | 'email_product_updates'
      | 'email_community_replies'
      | 'email_community_digest',
    value: boolean,
    savingKey: 'exam' | 'product' | 'communityReplies' | 'communityDigest'
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
      else setCommunityDigest(!value)
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
                <Loader2
                  className="absolute -right-7 h-4 w-4 animate-spin text-[var(--ec-text-secondary)]"
                  aria-hidden
                />
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
                <Loader2
                  className="absolute -right-7 h-4 w-4 animate-spin text-[var(--ec-text-secondary)]"
                  aria-hidden
                />
              )}
            </span>
          </label>

          <label className="ms-pref-toggle flex min-h-[56px] cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                Exam Room replies
              </span>
              <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                Email when someone comments on your post or replies to your comment.
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
                <Loader2
                  className="absolute -right-7 h-4 w-4 animate-spin text-[var(--ec-text-secondary)]"
                  aria-hidden
                />
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
                <Loader2
                  className="absolute -right-7 h-4 w-4 animate-spin text-[var(--ec-text-secondary)]"
                  aria-hidden
                />
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
