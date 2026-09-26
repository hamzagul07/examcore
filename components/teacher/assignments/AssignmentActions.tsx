'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { Sheet } from '@/components/ui/Sheet'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TeacherConfirmDialog } from '@/components/teacher/ClassroomSettingsForm'
import { downloadExport } from '@/components/teacher/download-export'
import { DueDatePicker } from '@/components/teacher/assignments/DueDatePicker'
import { sameMinute } from '@/components/teacher/assignments/format'
import { editDraftHref, exportHref, printHref, setsHref } from '@/components/teacher/assignments/links'

type Status = 'draft' | 'open' | 'closed'
type Confirm = 'close' | 'delete' | null
type Result = { tone: 'success' | 'error'; text: string } | null

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; field?: string }
  return { ok: res.ok, status: res.status, data }
}

function remindMessage(sent: number, eligible: number): string {
  if (eligible === 0) return 'Nobody needs a reminder: everyone on the set has handed in or is excused.'
  if (sent === 0) return 'No reminders went out — students reminded in the last few hours are skipped.'
  if (sent < eligible) return `Reminded ${sent} of the ${eligible} students still to hand in; the rest were reminded recently.`
  return `Reminder sent to ${sent} ${sent === 1 ? 'student' : 'students'}.`
}

/**
 * The set page's actions (docs/TEACHER_SYSTEM_SPEC.md §4 AssignmentHead:
 * Remind / Extend / Close / Print / Export; a draft adds Publish, Edit and Delete).
 * Each calls the assignments-backend route for it and refreshes the server
 * page; outcomes are announced in a live region under the buttons, and a
 * refused request shows the route's own message.
 *
 * "Extend" moves the whole set's due date; one student's deadline is changed
 * from the late list. Reopen appears only where clearing `closed_at` really
 * reopens the set (it was closed by hand and is inside its week after the
 * due date); otherwise moving the due date is the way to reopen it.
 */
export function AssignmentActions({
  classroomId,
  assignment,
  owing,
  canReopen,
  readOnly = false,
}: {
  classroomId: string
  assignment: { id: string; title: string; status: Status; due_at: string | null; allow_late: boolean }
  /** Active students who still owe work (Remind has someone to remind). */
  owing: number
  canReopen: boolean
  /** An archived class: only Print. */
  readOnly?: boolean
}) {
  const router = useRouter()
  const sheetTitleId = useId()
  const base = `/api/teacher/classroom/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignment.id)}`
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [confirmError, setConfirmError] = useState('')
  const [dueOpen, setDueOpen] = useState(false)
  const [due, setDue] = useState<string | null>(assignment.due_at)
  const [dueError, setDueError] = useState('')

  async function run(key: string, action: () => Promise<Result | void>) {
    if (busy) return
    setBusy(key)
    setResult(null)
    try {
      const next = await action()
      if (next) setResult(next)
    } catch {
      setResult({ tone: 'error', text: 'Could not reach the server. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  const publish = () =>
    run('publish', async () => {
      const r = await send(`${base}/publish`, 'POST')
      if (!r.ok) return { tone: 'error', text: r.data.error || 'Could not publish the set.' }
      router.refresh()
      return { tone: 'success', text: 'Published — your students can see it now.' }
    })

  const remind = () =>
    run('remind', async () => {
      const r = await send(`${base}/remind`, 'POST', {})
      if (!r.ok) return { tone: 'error', text: r.data.error || 'Could not send the reminder.' }
      const sent = typeof r.data.sent === 'number' ? r.data.sent : 0
      const eligible = typeof r.data.eligible === 'number' ? r.data.eligible : sent
      router.refresh()
      return { tone: 'success', text: remindMessage(sent, eligible) }
    })

  const reopen = () =>
    run('reopen', async () => {
      const r = await send(base, 'PATCH', { closed_at: null })
      if (!r.ok) return { tone: 'error', text: r.data.error || 'Could not reopen the set.' }
      router.refresh()
      return { tone: 'success', text: 'Reopened — students can hand in again.' }
    })

  async function confirmAction() {
    if (!confirm || busy) return
    setBusy(confirm)
    setConfirmError('')
    try {
      if (confirm === 'close') {
        const r = await send(base, 'PATCH', { closed_at: new Date().toISOString() })
        if (!r.ok) {
          setConfirmError(r.data.error || 'Could not close the set.')
          return
        }
        setConfirm(null)
        setResult({ tone: 'success', text: 'Closed. It has moved to the Closed tab.' })
        router.refresh()
      } else {
        const r = await send(base, 'DELETE')
        if (!r.ok) {
          setConfirmError(r.data.error || 'Could not delete the set.')
          return
        }
        setConfirm(null)
        router.push(setsHref(classroomId, assignment.status === 'draft' ? 'draft' : undefined))
        router.refresh()
      }
    } catch {
      setConfirmError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  async function saveDue(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy('due')
    setDueError('')
    try {
      const r = await send(base, 'PATCH', { due_at: due })
      if (!r.ok) {
        setDueError(r.data.error || 'Could not change the due date.')
        return
      }
      setDueOpen(false)
      setResult({ tone: 'success', text: due ? 'Due date changed.' : 'Due date removed.' })
      router.refresh()
    } catch {
      setDueError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const actionClass = 'ec-btn-ghost inline-flex min-h-[44px] items-center justify-center text-sm'
  const print = (
    <Link href={printHref(classroomId, assignment.id)} className={actionClass}>
      Print
    </Link>
  )
  // Fetched rather than linked, so a refused export shows its reason and a
  // file cut at the row ceiling says so (downloadExport).
  const exportCsv = () =>
    run('export', async () => {
      const r = await downloadExport(exportHref(classroomId, assignment.id), 'set-markbook.csv')
      if (!r.ok) return { tone: 'error', text: r.error }
      return {
        tone: 'success',
        text: r.truncated
          ? 'Downloaded — the set has more rows than one file holds, so the oldest were left out.'
          : 'Downloaded the set’s markbook.',
      }
    })
  const dueUnchanged = (due === null && assignment.due_at === null) || sameMinute(due, assignment.due_at)

  if (readOnly) {
    return (
      <div className="mb-6 flex flex-wrap gap-2 print:hidden" role="group" aria-label="Set actions">
        {print}
      </div>
    )
  }

  const draft = assignment.status === 'draft'
  const open = assignment.status === 'open'

  return (
    <div className="mb-6 print:hidden">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Set actions">
        {draft ? (
          <>
            <Button onClick={publish} loading={busy === 'publish'} loadingText="Publishing…" disabled={busy !== null}>
              Publish
            </Button>
            <Link href={editDraftHref(classroomId, assignment.id)} className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center">
              Edit draft
            </Link>
          </>
        ) : null}
        {open ? (
          <Button
            variant={owing > 0 ? 'primary' : 'secondary'}
            onClick={remind}
            loading={busy === 'remind'}
            loadingText="Sending…"
            disabled={busy !== null || owing === 0}
            title={owing === 0 ? 'Everyone has handed in or is excused' : undefined}
          >
            {owing > 0 ? `Remind ${owing} ${owing === 1 ? 'student' : 'students'}` : 'Remind'}
          </Button>
        ) : null}
        {!draft && !open && canReopen ? (
          <Button variant="secondary" onClick={reopen} loading={busy === 'reopen'} loadingText="Reopening…" disabled={busy !== null}>
            Reopen
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            setDue(assignment.due_at)
            setDueError('')
            setDueOpen(true)
          }}
          disabled={busy !== null}
        >
          {open ? 'Extend' : 'Change due date'}
        </Button>
        {open ? (
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmError('')
              setConfirm('close')
            }}
            disabled={busy !== null}
          >
            Close
          </Button>
        ) : null}
        {print}
        {!draft ? (
          <Button
            variant="ghost"
            onClick={exportCsv}
            loading={busy === 'export'}
            loadingText="Preparing…"
            disabled={busy !== null}
            className="text-sm"
          >
            Export CSV
          </Button>
        ) : null}
        <Button
          variant="danger"
          onClick={() => {
            setConfirmError('')
            setConfirm('delete')
          }}
          disabled={busy !== null}
        >
          {draft ? 'Delete draft' : 'Delete'}
        </Button>
      </div>

      <div className="mt-3" aria-live="polite">
        {result?.tone === 'success' ? <StatusMessage tone="success">{result.text}</StatusMessage> : null}
      </div>
      {result?.tone === 'error' ? <FormErrorAlert message={result.text} className="mt-3" /> : null}

      <TeacherConfirmDialog
        open={confirm === 'close'}
        onClose={() => setConfirm(null)}
        title={`Close “${assignment.title}”?`}
        confirmLabel="Close set"
        busyLabel="Closing…"
        onConfirm={confirmAction}
        busy={busy === 'close'}
        error={confirmError}
        tone="primary"
      >
        <p className="ms-teacher-confirm__body">
          It moves to the Closed tab and off your students&apos; to-do lists.{' '}
          {assignment.allow_late
            ? 'Students can still hand in late work, marked L.'
            : 'Nobody can hand anything in once it is closed.'}{' '}
          You can reopen it while it is within a week of its due date.
        </p>
      </TeacherConfirmDialog>

      <TeacherConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title={draft ? 'Delete this draft?' : `Delete “${assignment.title}”?`}
        confirmLabel={draft ? 'Delete draft' : 'Delete set'}
        busyLabel="Deleting…"
        onConfirm={confirmAction}
        busy={busy === 'delete'}
        error={confirmError}
      >
        <p className="ms-teacher-confirm__body">
          {draft
            ? 'Nobody has seen it; it goes from your drafts.'
            : 'It leaves every list, yours and your students’. Marks already handed in are kept on their records.'}
        </p>
      </TeacherConfirmDialog>

      <Sheet open={dueOpen} onClose={() => setDueOpen(false)} labelledById={sheetTitleId}>
        <form onSubmit={saveDue} noValidate className="flex flex-col gap-4">
          <h2 id={sheetTitleId} className="ms-teacher-confirm__title">
            {open ? 'Extend the deadline' : 'Change the due date'}
          </h2>
          <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
            {open
              ? 'For the whole class. Hand-ins are judged late against the new date; students with their own extension keep the later of the two.'
              : draft
                ? 'A set can only be published with a due date that has not passed.'
                : 'Moving the due date later can reopen a set that closed itself a week after it was due.'}
          </p>
          <DueDatePicker
            id={`${sheetTitleId}-due`}
            label="Due"
            value={due}
            onChange={setDue}
            chips={open && assignment.due_at ? { base: assignment.due_at } : 'default'}
            error={dueError || undefined}
          />
          <div className="ms-teacher-confirm__actions">
            <button
              type="button"
              onClick={() => setDueOpen(false)}
              disabled={busy === 'due'}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
            >
              Cancel
            </button>
            <Button type="submit" loading={busy === 'due'} loadingText="Saving…" disabled={dueUnchanged}>
              Save
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
