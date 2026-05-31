'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

type UsageRow = {
  id: string
  eventType: string
  source: string
  creditsDelta: number
  createdAt: string
}

type BillingInfo = {
  tier: string
  status: string
  billingPeriod: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  credits: number
  foundingMember: boolean
  marksUsed: number
  markCap: number | null
  periodResetsAt: string | null
  recentUsage: UsageRow[]
}

export function AccountClient({
  email,
  initialProfile,
  billing,
}: {
  email: string
  initialProfile: InitialProfile
  billing: BillingInfo
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="animate-entry stagger-1">
        <ProfileSection initialProfile={initialProfile} />
      </div>
      <div className="animate-entry stagger-2">
        <BillingSection billing={billing} />
      </div>
      <div className="animate-entry stagger-3">
        <EmailSection email={email} />
      </div>
      <div className="animate-entry stagger-4">
        <PasswordSection />
      </div>
      <div className="animate-entry stagger-5">
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

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  student: 'Student',
  unlimited: 'Unlimited',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  unpaid: 'Unpaid',
}

function BillingSection({ billing }: { billing: BillingInfo }) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Safety net: if this user has no Stripe customer yet (e.g. signed up before
  // billing launched, or sync failed at verify time), lazily create one on
  // first visit to the billing surface. Fire-and-forget.
  useEffect(() => {
    if (!billing.hasCustomer) {
      void fetch('/api/billing/sync-customer', { method: 'POST' }).catch(() => {})
    }
  }, [billing.hasCustomer])

  async function openPortal() {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: '/account' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        setErrorMsg(data?.error || 'Could not open the billing portal.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setErrorMsg('Could not open the billing portal.')
      setLoading(false)
    }
  }

  const tierLabel = TIER_LABELS[billing.tier] ?? billing.tier
  const statusLabel = STATUS_LABELS[billing.status] ?? billing.status
  const renews = billing.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString()
    : null
  const isPaid = billing.tier !== 'free'

  const unlimited = billing.markCap === null
  const pct = unlimited
    ? 0
    : Math.min(100, Math.round((billing.marksUsed / Math.max(1, billing.markCap ?? 1)) * 100))
  const resetDate = billing.periodResetsAt
    ? new Date(billing.periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <SectionCard>
      <SectionHeader
        title="Billing"
        description="Your current plan, credits, and subscription management."
      />

      <div className="space-y-4">
        {billing.foundingMember && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            🎉 Founding member · 50% off forever
          </span>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3">
            <p className="label-overline mb-1 text-slate-500">Plan</p>
            <p className="text-base font-semibold text-slate-100">{tierLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3">
            <p className="label-overline mb-1 text-slate-500">Status</p>
            <p className="text-base font-semibold text-slate-100">{statusLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3">
            <p className="label-overline mb-1 text-slate-500">Credits</p>
            <p className="text-base font-semibold text-slate-100">{billing.credits}</p>
          </div>
        </div>

        {/* Usage this period */}
        <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="label-overline text-slate-500">Marks this period</p>
            <p className="text-sm font-semibold text-slate-200">
              {unlimited ? `${billing.marksUsed} · Unlimited` : `${billing.marksUsed} / ${billing.markCap}`}
            </p>
          </div>
          {!unlimited && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {resetDate && (
            <p className="mt-2 text-xs text-slate-500">Resets {resetDate}.</p>
          )}
        </div>

        {/* Recent usage */}
        {billing.recentUsage.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-dark-900/60 px-4 py-3">
            <p className="label-overline mb-2 text-slate-500">Recent activity</p>
            <ul className="divide-y divide-white/5">
              {billing.recentUsage.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-200">
                    {u.eventType === 'mark_whole_paper' ? 'Whole paper' : 'Single question'}
                    {u.source === 'credits' && (
                      <span className="ml-2 text-xs text-emerald-400">(credit)</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPaid && billing.cancelAtPeriodEnd && (
          <p className="text-sm text-amber-400">
            Your plan is set to cancel
            {renews ? ` on ${renews}` : ' at the end of the current period'}.
          </p>
        )}
        {isPaid && !billing.cancelAtPeriodEnd && renews && (
          <p className="text-sm text-slate-500">Renews on {renews}.</p>
        )}

        {errorMsg && <ErrorBox message={errorMsg} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            size="md"
            onClick={openPortal}
            isLoading={loading}
            loadingText="Opening..."
          >
            Manage subscription
          </Button>
          <Link href="/pricing" className="inline-flex">
            <Button variant="primary" size="md" type="button">
              View pricing
            </Button>
          </Link>
        </div>
      </div>
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
