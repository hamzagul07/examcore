'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'
import { UsernameField, type UsernameState } from '@/components/auth/UsernameField'

type Props = {
  email: string
  initialFullName: string
  initialUsername: string
  board: string
  level: string
  subjects: string[]
}

export function ProfileSection({
  email,
  initialFullName,
  initialUsername,
  board,
  level,
  subjects,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [username, setUsername] = useState<UsernameState>({
    value: initialUsername,
    valid: false,
  })
  const [savedUsername, setSavedUsername] = useState(initialUsername)
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState('')

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault()
    setUsernameError('')
    setUsernameSuccess('')
    if (!username.valid || username.value === savedUsername) {
      setUsernameError(
        username.value === savedUsername ? 'That is already your username.' : 'Pick an available username.'
      )
      return
    }
    setUsernameLoading(true)
    const res = await fetch('/api/community/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value }),
    })
    setUsernameLoading(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUsernameError(data?.error || 'Could not save your username.')
      return
    }
    setSavedUsername(data.username || username.value)
    setUsernameSuccess('Username updated.')
  }

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
    <>
    <SettingsSectionCard
      title="Community username"
      description="Your public name in the Exam Room community (u/yourname)."
    >
      <form onSubmit={handleSaveUsername} className="space-y-4">
        <SettingsFieldGroup label="Username">
          {savedUsername ? (
            <p className="mb-2 text-sm text-[var(--ec-text-secondary)]">
              Current: <strong className="text-[var(--ec-text-primary)]">u/{savedUsername}</strong>
              {' · '}
              <a
                href={`/u/${savedUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ec-link"
              >
                View public profile
              </a>
            </p>
          ) : (
            <p className="mb-2 text-sm text-[var(--ec-text-secondary)]">
              You haven&apos;t set a username yet.
            </p>
          )}
          <UsernameField value={username.value} onChange={setUsername} />
        </SettingsFieldGroup>

        {usernameError && <ErrorBox message={usernameError} />}
        {usernameSuccess && <SuccessBox message={usernameSuccess} />}

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={usernameLoading}
          loadingText="Saving..."
        >
          {savedUsername ? 'Change username' : 'Set username'}
        </Button>
      </form>
    </SettingsSectionCard>

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
    </>
  )
}
