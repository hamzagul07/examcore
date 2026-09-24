'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { ErrorBox } from '@/components/AuthFormBits'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'
import { SavedStamp, useSavedStamp } from '@/components/settings/SettingsShell'

export function PrivacySection() {
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  // Errors render inside the card they belong to — a failed delete shown at
  // the page bottom is too easy to miss.
  const [exportError, setExportError] = useState('')
  const [exportSuccess, setExportSuccess] = useState('')
  // "Type DELETE" is the field's own rule; a failed request is the form's.
  const [deleteFieldError, setDeleteFieldError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const exportStamp = useSavedStamp()
  const deleteTitleId = useId()



  function openDelete() {
    setDeleteConfirm('')
    setDeleteFieldError('')
    setDeleteError('')
    setDeleteOpen(true)
  }

  function closeDelete() {
    if (deleteLoading) return
    setDeleteOpen(false)
    setDeleteConfirm('')
    setDeleteFieldError('')
    setDeleteError('')
  }

  async function handleExport() {
    setExportLoading(true)
    setExportError('')
    setExportSuccess('')
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
      setExportSuccess('Your data export has downloaded.')
      exportStamp.showSaved()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') {
      setDeleteFieldError('Type DELETE in the box to confirm.')
      return
    }
    setDeleteLoading(true)
    setDeleteFieldError('')
    setDeleteError('')
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
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
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
        <div className="flex flex-wrap items-center gap-3">
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
          <SavedStamp state={exportStamp.stamp} label="✓ Downloaded" />
        </div>
        {exportError && (
          <div className="mt-4">
            <ErrorBox message={exportError} />
          </div>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {exportSuccess}
        </span>
      </SettingsSectionCard>


      <SettingsSectionCard title="Delete account">
        <p className="text-body mb-4">
          Permanently removes your account, attempts, and uploads. This cannot be
          undone.
        </p>
        <Button type="button" variant="danger" size="md" onClick={openDelete}>
          Delete my account
        </Button>
      </SettingsSectionCard>

      {/* The typed confirmation lives in the sheet, so a stray click on the
          card can never delete anything. */}
      <Sheet open={deleteOpen} onClose={closeDelete} labelledById={deleteTitleId}>
        <span className="ec-ink-stamp ec-ink-stamp--hero ec-ink-stamp--crimson mb-4" aria-hidden>
          !
        </span>
        <h2 id={deleteTitleId} className="text-headline text-[var(--ec-text-primary)]">
          Delete account
        </h2>
        <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
          Permanently removes your account, attempts, and uploads. This cannot be
          undone.
        </p>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            void handleDelete()
          }}
        >
          <Field
            label="Type DELETE to confirm"
            labelClassName="label-overline mb-2 block"
            error={deleteFieldError}
            inputProps={{
              id: 'deleteConfirm',
              type: 'text',
              value: deleteConfirm,
              onChange: (e) => {
                setDeleteConfirm(e.target.value)
                if (deleteFieldError) setDeleteFieldError('')
              },
              autoComplete: 'off',
              autoCapitalize: 'characters',
              spellCheck: false,
              disabled: deleteLoading,
            }}
          />

          {deleteError && (
            <div className="mt-4">
              <ErrorBox message={deleteError} />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="submit"
              variant="danger"
              size="md"
              fullWidth
              disabled={deleteLoading || deleteConfirm !== 'DELETE'}
              loading={deleteLoading}
              loadingMode="morph"
              loadingText="Deleting…"
            >
              Delete my account
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              disabled={deleteLoading}
              onClick={closeDelete}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Sheet>

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
    </div>
  )
}
