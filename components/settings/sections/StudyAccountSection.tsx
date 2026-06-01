'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/PasswordInput'
import { ProfileFormFields } from '@/components/ProfileFormFields'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import { BOARDS, LEVELS, SUBJECTS } from '@/lib/profile-options'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
  SettingsStatTile,
  SettingsSubsection,
} from '@/components/settings/SettingsSectionCard'

const STAGE_LABELS: Record<UserStage, string> = {
  as_level: 'AS Level (Year 12)',
  a2_level: 'A2 Level (Year 13)',
  other: 'Just exploring',
}

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  mark_papers: 'Mark practice papers',
  track_progress: 'Track progress per topic',
  essay_feedback: 'Get feedback on essays',
}

type StudyProfile = {
    full_name: string
    board: string
    level: string
    subjects: string[]
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
    created_at: string | null
}

type Props = {
  initialProfile: StudyProfile
}

export function StudyAccountSection({ initialProfile }: Props) {
  const createdLabel = initialProfile.created_at
    ? new Date(initialProfile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Account"
        description="Your exam setup and when you joined."
      >
        <SettingsStatTile label="Member since" value={createdLabel} />

        <div className="mt-6 space-y-4">
          <SettingsFieldGroup label="Exam board">
            <p className="text-body-large text-[var(--ec-text-primary)]">
              {BOARDS.find((b) => b.id === initialProfile.board)?.label ??
                initialProfile.board}
            </p>
          </SettingsFieldGroup>

          <SettingsFieldGroup label="Cambridge level">
            <p className="text-body-large text-[var(--ec-text-primary)]">
              {LEVELS.find((l) => l.id === initialProfile.level)?.label ??
                initialProfile.level}
            </p>
          </SettingsFieldGroup>

          <SettingsFieldGroup label="Subjects">
            <ul className="flex flex-wrap gap-2">
              {initialProfile.subjects.map((id) => {
                const subject = SUBJECTS.find((s) => s.id === id)
                return (
                  <li
                    key={id}
                    className="ec-chip ec-chip-neutral"
                    style={{ fontSize: '13px' }}
                  >
                    {subject?.label ?? id}
                  </li>
                )
              })}
            </ul>
          </SettingsFieldGroup>

          {(initialProfile.stage || initialProfile.primary_goal) ? (
            <div
              className="space-y-3 rounded-2xl border px-4 py-4"
              style={{
                borderColor: 'var(--ec-border)',
                background: 'var(--ec-surface-raised)',
              }}
            >
              {initialProfile.stage && (
                <div>
                  <p className="label-overline mb-1">Study stage</p>
                  <p className="text-body text-[var(--ec-text-primary)]">
                    {STAGE_LABELS[initialProfile.stage]}
                  </p>
                </div>
              )}
              {initialProfile.primary_goal && (
                <div>
                  <p className="label-overline mb-1">Primary goal</p>
                  <p className="text-body text-[var(--ec-text-primary)]">
                    {GOAL_LABELS[initialProfile.primary_goal]}
                  </p>
                </div>
              )}
              <p className="text-caption">
                Want to change these?{' '}
                <Link
                  href="/onboarding?rerun=1&next=/account/study"
                  className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
                >
                  Re-run onboarding →
                </Link>
              </p>
            </div>
          ) : (
            <p className="text-caption">
              Want to set your study stage or goal?{' '}
              <Link
                href="/onboarding?rerun=1&next=/account/study"
                className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
              >
                Re-run onboarding →
              </Link>
            </p>
          )}
        </div>
      </SettingsSectionCard>

      <StudySubjectsEditor initialProfile={initialProfile} />
      <AccountSecuritySection />
    </div>
  )
}

function StudySubjectsEditor({
  initialProfile,
}: {
  initialProfile: StudyProfile
}) {
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
        full_name: initialProfile.full_name.trim() || null,
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
    setSuccessMsg('Subjects and level updated.')
  }

  return (
    <SettingsSectionCard
      title="Subjects & level"
      description="Changes what papers and progress we surface for you."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <ProfileFormFields
          fullName={initialProfile.full_name}
          setFullName={() => {}}
          board={board}
          setBoard={setBoard}
          level={level}
          setLevel={setLevel}
          subjects={subjects}
          setSubjects={setSubjects}
          showFullName={false}
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
    </SettingsSectionCard>
  )
}

function AccountSecuritySection() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const valid = newPassword.length >= 8 && newPassword === confirmPassword

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
    <SettingsSectionCard title="Security">
      <SettingsSubsection title="Password">
        {!open ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body">
              Use a password alongside (or instead of) magic links.
            </p>
            <Button
              variant="secondary"
              size="md"
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
                size="md"
                type="button"
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
                size="md"
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
      </SettingsSubsection>
    </SettingsSectionCard>
  )
}
