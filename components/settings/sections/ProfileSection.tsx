'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'

type Props = {
  email: string
  initialFullName: string
  board: string
  level: string
  subjects: string[]
}

export function ProfileSection({
  email,
  initialFullName,
  board,
  level,
  subjects,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim() || null,
        board,
        level,
        subjects,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not save your changes. Try again.')
      return
    }
    setSuccessMsg('Profile updated.')
  }

  return (
    <SettingsSectionCard
      title="Profile"
      description="How you appear across MarkScheme."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <SettingsFieldGroup label="Display name">
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            placeholder="Hassan"
            className="ec-input"
          />
        </SettingsFieldGroup>

        <SettingsFieldGroup
          label="Email"
          hint="Email cannot be changed yet. Contact support if you need to update it."
        >
          <div
            className="rounded-xl border px-4 py-3 font-mono text-body text-[var(--ec-text-primary)]"
            style={{
              borderColor: 'var(--ec-border)',
              background: 'var(--ec-surface-raised)',
            }}
          >
            {email || '—'}
          </div>
        </SettingsFieldGroup>

        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          loadingText="Saving..."
        >
          Save changes
        </Button>
      </form>
    </SettingsSectionCard>
  )
}
