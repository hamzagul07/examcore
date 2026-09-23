'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { ErrorBox } from '@/components/AuthFormBits'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'
import { SavedStamp, useSavedStamp } from '@/components/settings/SettingsShell'
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
  const profileStamp = useSavedStamp()

  const [username, setUsername] = useState<UsernameState>({
    value: initialUsername,
    valid: false,
  })
  const [savedUsername, setSavedUsername] = useState(initialUsername)
  const [usernameLoading, setUsernameLoading] = useState(false)
  // A username problem belongs to the username field; only a failed request
  // is a form-level error.
  const [usernameFieldError, setUsernameFieldError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState('')
  const usernameStamp = useSavedStamp()

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault()
    setUsernameFieldError('')
    setUsernameError('')
    setUsernameSuccess('')
    usernameStamp.clearSaved()
    if (!username.valid || username.value === savedUsername) {
      setUsernameFieldError(
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
    usernameStamp.showSaved()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    profileStamp.clearSaved()

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
    profileStamp.showSaved()
  }

  return (
    <>
    <SettingsSectionCard
      title="Community username"
      description="Your public name in the Exam Room community (u/yourname)."
    >
      <form onSubmit={handleSaveUsername} className="space-y-4">
        <SettingsFieldGroup label="Username" htmlFor="username">
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
          <UsernameField value={username.value} onChange={setUsername} id="username" />
          {/* UsernameField owns its input, so the field error sits directly
              beneath it in Field's own error style. */}
          {usernameFieldError && (
            <p className="mt-1.5 text-xs text-[var(--ec-danger,#b91c1c)]" role="alert">
              {usernameFieldError}
            </p>
          )}
        </SettingsFieldGroup>

        {usernameError && <ErrorBox message={usernameError} />}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={usernameLoading}
            loadingText="Saving..."
          >
            {savedUsername ? 'Change username' : 'Set username'}
          </Button>
          <SavedStamp state={usernameStamp.stamp} label={<>✓ {usernameSuccess || 'Saved'}</>} />
        </div>
        <span role="status" aria-live="polite" className="sr-only">
          {usernameSuccess}
        </span>
      </form>
    </SettingsSectionCard>

    <SettingsSectionCard
      title="Profile"
      description="How you appear across MarkScheme."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <Field
          label="Display name"
          labelClassName="label-overline mb-2 block"
          inputProps={{
            id: 'fullName',
            type: 'text',
            value: fullName,
            onChange: (e) => setFullName(e.target.value),
            maxLength: 80,
            placeholder: 'Hassan',
            autoComplete: 'name',
          }}
        />

        <SettingsFieldGroup
          label="Email"
          hint="Email cannot be changed yet. Contact support if you need to update it."
        >
          <div
            className="ec-card ec-card--paper border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-4 py-3 font-mono text-body text-[var(--ec-text-primary)]"
            aria-describedby="email-hint"
          >
            {email || '—'}
          </div>
        </SettingsFieldGroup>

        {errorMsg && <ErrorBox message={errorMsg} />}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            loadingText="Saving..."
          >
            Save changes
          </Button>
          <SavedStamp state={profileStamp.stamp} label={<>✓ {successMsg || 'Saved'}</>} />
        </div>
        <span role="status" aria-live="polite" className="sr-only">
          {successMsg}
        </span>
      </form>
    </SettingsSectionCard>
    </>
  )
}
