'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'

export function PrivacySection() {
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleExport() {
    setExportLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Export failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? 'markscheme-export.json'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg('Your data export has downloaded.')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') {
      setErrorMsg('Type DELETE in the box to confirm.')
      return
    }
    setDeleteLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Could not delete account')
      }
      window.location.href = '/'
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed')
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Your data"
        description="Download everything we store about your account."
      >
        <p className="text-body mb-4">
          Includes your profile, marking attempts, subscription status, and usage
          history (last 500 attempts).
        </p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => void handleExport()}
          loading={exportLoading}
          loadingMode="shimmer"
          loadingText="Preparing export…"
        >
          Download my data
        </Button>
      </SettingsSectionCard>

      <SettingsSectionCard title="Delete account">
        <p className="text-body mb-4">
          Permanently removes your account, attempts, and uploads. This cannot be
          undone.
        </p>
        <label className="label-overline mb-2 block" htmlFor="deleteConfirm">
          Type DELETE to confirm
        </label>
        <input
          id="deleteConfirm"
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          className="ec-input mb-4 max-w-xs"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => void handleDelete()}
          disabled={deleteLoading || deleteConfirm !== 'DELETE'}
          loading={deleteLoading}
          loadingMode="morph"
          loadingText="Deleting…"
          className="ec-btn-secondary border-[color-mix(in_srgb,var(--ec-chip-critical-text)_40%,transparent)] ec-score-low hover:border-[color-mix(in_srgb,var(--ec-chip-critical-text)_60%,transparent)]"
        >
          Delete my account
        </Button>
      </SettingsSectionCard>

      <SettingsSectionCard title="Legal">
        <ul className="space-y-2 text-body">
          <li>
            <Link
              href="/privacy"
              className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
            >
              Privacy policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline"
            >
              Terms of service
            </Link>
          </li>
        </ul>
      </SettingsSectionCard>

      {errorMsg && <ErrorBox message={errorMsg} />}
      {successMsg && <SuccessBox message={successMsg} />}
    </div>
  )
}
