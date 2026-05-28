'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/PasswordInput'
import { ProfileFormFields } from '@/components/ProfileFormFields'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'

type InitialProfile = {
  full_name: string
  board: string
  level: string
  subjects: string[]
}

export function AccountClient({
  email,
  initialProfile,
}: {
  email: string
  initialProfile: InitialProfile
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="animate-entry stagger-1">
        <ProfileSection initialProfile={initialProfile} />
      </div>
      <div className="animate-entry stagger-2">
        <EmailSection email={email} />
      </div>
      <div className="animate-entry stagger-3">
        <PasswordSection />
      </div>
      <div className="animate-entry stagger-4">
        <DangerSection />
      </div>
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Card variant="glass" padding="lg" as="section">
      {children}
    </Card>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <h2 className="text-h3 tracking-tight text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
      )}
    </div>
  )
}

function ProfileSection({ initialProfile }: { initialProfile: InitialProfile }) {
  const [fullName, setFullName] = useState(initialProfile.full_name)
  const [board, setBoard] = useState(initialProfile.board)
  const [level, setLevel] = useState(initialProfile.level)
  const [subjects, setSubjects] = useState<string[]>(initialProfile.subjects)
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
    <SectionCard>
      <SectionHeader
        title="Profile"
        description="This personalizes your dashboard and the papers we surface."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <ProfileFormFields
          fullName={fullName}
          setFullName={setFullName}
          board={board}
          setBoard={setBoard}
          level={level}
          setLevel={setLevel}
          subjects={subjects}
          setSubjects={setSubjects}
        />

        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          loadingText="Saving..."
          disabled={subjects.length === 0}
        >
          Save changes
        </Button>
      </form>
    </SectionCard>
  )
}

function EmailSection({ email }: { email: string }) {
  return (
    <SectionCard>
      <SectionHeader title="Email" />
      <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3 font-mono text-sm text-slate-200">
        {email || '—'}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Need to change your email? Contact support.
      </p>
    </SectionCard>
  )
}

function PasswordSection() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const valid =
    newPassword.length >= 8 && newPassword === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setSuccessMsg('Password updated.')
    setNewPassword('')
    setConfirmPassword('')
    setOpen(false)
  }

  return (
    <SectionCard>
      <SectionHeader
        title="Password"
        description="Set or change the password used to sign in."
      />

      {!open ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Use a password alongside (or instead of) magic links.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOpen(true)
              setSuccessMsg('')
              setErrorMsg('')
            }}
          >
            Set or change password
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword" className="label-overline mb-2 inline-block">
              New password
            </Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="label-overline mb-2 inline-block">
              Confirm new password
            </Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          </div>

          {errorMsg && <ErrorBox message={errorMsg} />}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOpen(false)
                setNewPassword('')
                setConfirmPassword('')
                setErrorMsg('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
              loadingText="Updating..."
              disabled={!valid}
            >
              Update password
            </Button>
          </div>
        </form>
      )}

      {successMsg && (
        <div className="mt-4">
          <SuccessBox message={successMsg} />
        </div>
      )}
    </SectionCard>
  )
}

function DangerSection() {
  return (
    <SectionCard>
      <SectionHeader title="Danger zone" />
      <form action="/auth/signout" method="POST">
        <Button type="submit" variant="danger" size="sm">
          Sign out
        </Button>
      </form>
    </SectionCard>
  )
}
