'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'

type Props = {
  initialExamReminders: boolean
  initialProductUpdates: boolean
}

export function PreferencesSection({
  initialExamReminders,
  initialProductUpdates,
}: Props) {
  const [examReminders, setExamReminders] = useState(initialExamReminders)
  const [productUpdates, setProductUpdates] = useState(initialProductUpdates)
  const [saving, setSaving] = useState<'exam' | 'product' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function savePreference(
    field: 'email_exam_reminders' | 'email_product_updates',
    value: boolean,
    savingKey: 'exam' | 'product'
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
      else setProductUpdates(!value)
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
        </div>
      </SettingsSectionCard>

      {errorMsg && <ErrorBox message={errorMsg} />}
      {successMsg && <SuccessBox message={successMsg} />}
    </div>
  )
}
