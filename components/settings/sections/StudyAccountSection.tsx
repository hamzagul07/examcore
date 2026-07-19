'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/PasswordInput'
import { SuccessBox } from '@/components/AuthFormBits'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import {
  BOARDS,
  LEVELS,
  getSubjectById,
  isIbBoard,
} from '@/lib/profile-options'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
  SettingsStatTile,
  SettingsSubsection,
} from '@/components/settings/SettingsSectionCard'

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
        description="Your exam setup at a glance and when you joined."
      >
        <SettingsStatTile label="Member since" value={createdLabel} />

        <div className="mt-6 space-y-4">
          <SettingsFieldGroup label="Exam board">
            <p className="text-body-large text-[var(--ec-text-primary)]">
              {BOARDS.find((b) => b.id === initialProfile.board)?.label ??
                initialProfile.board}
            </p>
          </SettingsFieldGroup>

          <SettingsFieldGroup label={isIbBoard(initialProfile.board) ? 'Programme' : 'Cambridge level'}>
            <p className="text-body-large text-[var(--ec-text-primary)]">
              {isIbBoard(initialProfile.board)
                ? 'IB Diploma'
                : LEVELS.find((l) => l.id === initialProfile.level)?.label ??
                  initialProfile.level}
            </p>
          </SettingsFieldGroup>

          <SettingsFieldGroup label="Subjects">
            <ul className="flex flex-wrap gap-2">
              {initialProfile.subjects.map((id) => {
                const subject = getSubjectById(id, initialProfile.level)
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

          <Link
            href="/account/exam"
            className="inline-flex min-h-[44px] items-center gap-1 text-body font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
          >
            Change board, subjects, stage, or exam date in Exam setup
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </SettingsSectionCard>

      <AccountSecuritySection />
    </div>
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

            {errorMsg && <FormErrorAlert message={errorMsg} />}

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
