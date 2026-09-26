'use client'

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ClassroomSettings } from '@/lib/teacher/types'
import { downloadExport } from '@/components/teacher/download-export'

/*
 * Class settings islands (spec §4 ".../settings"): the details form, the CSV
 * export buttons, the danger zone, and the confirm dialog the settings page,
 * InviteCard and RosterList share. The page is a server component that loads
 * the class and roster once and renders these.
 */

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

/**
 * A confirmation step on the shared Dialog (bottom sheet on a phone, centred
 * on desktop, focus-trapped, Escape closes). `tone="danger"` gives the
 * confirm button the crimson outline the danger zone uses; the error slot
 * shows a failed request without closing, so the teacher can retry.
 */
export function TeacherConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  busyLabel,
  onConfirm,
  busy = false,
  error = '',
  tone = 'danger',
  confirmDisabled = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  onConfirm: () => void
  busy?: boolean
  error?: string
  tone?: 'danger' | 'primary'
  confirmDisabled?: boolean
}) {
  const titleId = useId()
  return (
    <Dialog open={open} onClose={onClose} labelledById={titleId}>
      <div className="ms-teacher-confirm">
        <h2 id={titleId} className="ms-teacher-confirm__title">
          {title}
        </h2>
        {children}
        {error ? <FormErrorAlert message={error} className="mt-4" /> : null}
        <div className="ms-teacher-confirm__actions">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            aria-busy={busy || undefined}
            className={
              tone === 'danger'
                ? 'ms-teacher-danger__btn'
                : 'ec-btn-primary inline-flex min-h-[44px] items-center justify-center disabled:opacity-60'
            }
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Details form
// ---------------------------------------------------------------------------

export type SubjectChoice = { code: string; label: string }

export type SettingsFormClassroom = {
  id: string
  name: string
  description: string | null
  year_group: string | null
  subject_code: string | null
  settings: ClassroomSettings
  archived_at: string | null
}

type FieldName = 'name' | 'description' | 'year_group' | 'subject_code' | 'settings.notify_submissions' | 'settings.student_can_see_class_avg'

const NO_SUBJECT = ''

type FormValues = {
  name: string
  description: string
  year_group: string
  subject_code: string
  notify: 'daily' | 'off'
  classAvg: boolean
}

function toFormValues(c: SettingsFormClassroom): FormValues {
  return {
    name: c.name,
    description: c.description ?? '',
    year_group: c.year_group ?? '',
    subject_code: c.subject_code ?? NO_SUBJECT,
    notify: c.settings.notify_submissions ?? 'daily',
    classAvg: c.settings.student_can_see_class_avg === true,
  }
}

/**
 * Name, note, year group, syllabus, submission alerts and class-average
 * visibility. Sends only what changed (PATCH merges settings server-side), and
 * puts a refused field's message under that field.
 *
 * The syllabus is chosen from the registry: the likely codes for this class
 * as one tap each, and every syllabus in a grouped list beside them. A class
 * with none set gets a warning, because every analytics read and the question
 * picker are scoped by it.
 */
export function ClassroomSettingsForm({
  classroom,
  suggested,
  groups,
}: {
  classroom: SettingsFormClassroom
  suggested: SubjectChoice[]
  groups: Array<{ label: string; options: SubjectChoice[] }>
}) {
  const router = useRouter()
  const readOnly = classroom.archived_at !== null
  // `baseline` is what the server last said; `values` is the form. A refresh
  // triggered elsewhere on the page (a new invite code) moves the baseline
  // without touching half-typed edits.
  const fromServer = useMemo(() => toFormValues(classroom), [classroom])
  const [baseline, setBaseline] = useState(fromServer)
  const [values, setValues] = useState(fromServer)
  useEffect(() => setBaseline(fromServer), [fromServer])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ message: string; field?: FieldName } | null>(null)
  const [saved, setSaved] = useState('')
  const subjectLabelId = useId()
  const notifyLabelId = useId()
  const subjectSelectId = useId()
  const subjectHintId = useId()

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved('')
  }

  const patch: Record<string, unknown> = {}
  if (values.name.trim() !== baseline.name.trim()) patch.name = values.name
  if (values.description.trim() !== baseline.description.trim()) patch.description = values.description
  if (values.year_group.trim() !== baseline.year_group.trim()) patch.year_group = values.year_group
  if (values.subject_code !== baseline.subject_code) patch.subject_code = values.subject_code || null
  const settings: Record<string, unknown> = {}
  if (values.notify !== baseline.notify) settings.notify_submissions = values.notify
  if (values.classAvg !== baseline.classAvg) settings.student_can_see_class_avg = values.classAvg
  if (Object.keys(settings).length) patch.settings = settings
  const dirty = Object.keys(patch).length > 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty || saving || readOnly) return
    if (!values.name.trim()) {
      setError({ message: 'Give the class a name.', field: 'name' })
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/classroom/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        field?: FieldName
        classroom?: SettingsFormClassroom
      }
      if (!res.ok) {
        setError({ message: data.error || 'Could not save. Try again.', field: data.field })
        return
      }
      if (data.classroom) {
        // The server stores plain text (tags and stray spacing removed), so
        // the form shows what was actually saved.
        const next = toFormValues(data.classroom)
        setBaseline(next)
        setValues(next)
      }
      setSaved('Saved.')
      router.refresh()
    } catch {
      setError({ message: 'Could not reach the server. Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (field: FieldName) => (error?.field === field ? error.message : undefined)
  const inSuggested = suggested.some((s) => s.code === values.subject_code)

  return (
    <form onSubmit={save} className="ms-teacher-settings__form" noValidate>
      {readOnly ? (
        <p className="ms-teacher-start__hint">
          Read-only while the class is archived — restore it below to edit these.
        </p>
      ) : null}
      <fieldset disabled={readOnly || saving} className="contents">
        <div className="ms-teacher-settings__grid">
          <Field
            label="Class name"
            labelClassName="ms-teacher-start__legend"
            error={fieldError('name')}
            inputProps={{
              id: 'settings-name',
              value: values.name,
              onChange: (e) => set('name', e.target.value),
              maxLength: 120,
              required: true,
              autoComplete: 'off',
            }}
          />
          <Field
            label="Year group"
            labelClassName="ms-teacher-start__legend"
            hint="Shown beside the name, e.g. Year 13."
            error={fieldError('year_group')}
            inputProps={{
              id: 'settings-year',
              value: values.year_group,
              onChange: (e) => set('year_group', e.target.value),
              maxLength: 40,
              autoComplete: 'off',
            }}
          />
        </div>

        <Field
          as="textarea"
          label="Note to yourself"
          labelClassName="ms-teacher-start__legend"
          hint="Only you see this."
          error={fieldError('description')}
          inputProps={{
            id: 'settings-description',
            value: values.description,
            onChange: (e) => set('description', e.target.value),
            rows: 2,
            maxLength: 500,
            className: 'resize-y',
          }}
        />

        <div className="ms-teacher-start__field">
          <p id={subjectLabelId} className="ms-teacher-start__legend">
            Syllabus
          </p>
          {suggested.length ? (
            <SegmentedControl
              className="ms-teacher-start__choices"
              optionClassName="ms-teacher-start__choice"
              aria-labelledby={subjectLabelId}
              aria-describedby={subjectHintId}
              value={inSuggested ? values.subject_code : null}
              onChange={(code) => set('subject_code', code)}
              disabled={readOnly || saving}
              options={suggested.map((s) => ({ value: s.code, label: s.label }))}
            />
          ) : null}
          <label htmlFor={subjectSelectId} className="ms-teacher-start__hint">
            {suggested.length ? 'Or pick any syllabus' : 'Pick the syllabus'}
          </label>
          <select
            id={subjectSelectId}
            className="ec-input ms-teacher-start__input"
            value={values.subject_code}
            onChange={(e) => set('subject_code', e.target.value)}
            aria-invalid={fieldError('subject_code') ? true : undefined}
            aria-describedby={subjectHintId}
          >
            <option value={NO_SUBJECT}>No syllabus set</option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p
            id={subjectHintId}
            className={values.subject_code ? 'ms-teacher-start__hint' : 'ms-teacher-start__error'}
            role={fieldError('subject_code') ? 'alert' : undefined}
          >
            {fieldError('subject_code') ??
              (values.subject_code
                ? 'Blindspots, the question picker and the class analytics read marks against this syllabus.'
                : 'No syllabus yet — the class analytics cannot tell which topics a mark belongs to until you pick one.')}
          </p>
        </div>

        <div className="ms-teacher-start__field">
          <p id={notifyLabelId} className="ms-teacher-start__legend">
            Hand-in alerts
          </p>
          <SegmentedControl
            className="ms-teacher-start__choices"
            optionClassName="ms-teacher-start__choice"
            aria-labelledby={notifyLabelId}
            value={values.notify}
            onChange={(v) => set('notify', v)}
            disabled={readOnly || saving}
            options={[
              { value: 'daily', label: 'Once a day' },
              { value: 'off', label: 'Off' },
            ]}
          />
          <p className="ms-teacher-start__hint">
            One notification per set per day when students hand in — never one per student. The Sunday
            digest email is separate, in your account preferences.
          </p>
        </div>

        <label className="ms-teacher-settings__toggle">
          <input
            type="checkbox"
            role="switch"
            checked={values.classAvg}
            onChange={(e) => set('classAvg', e.target.checked)}
          />
          <span>
            Show students the class average
            <small>
              Off by default. When on, a student sees the class mean on sets they have handed in —
              never another student&apos;s name or mark.
            </small>
          </span>
        </label>
      </fieldset>

      {error && !error.field ? <FormErrorAlert message={error.message} /> : null}
      {error?.field?.startsWith('settings.') ? <FormErrorAlert message={error.message} /> : null}

      {!readOnly ? (
        <div className="ms-teacher-settings__actions">
          <button
            type="submit"
            disabled={!dirty || saving}
            aria-busy={saving || undefined}
            className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {dirty && !saving ? (
            <button
              type="button"
              onClick={() => {
                setValues(baseline)
                setError(null)
              }}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
            >
              Undo changes
            </button>
          ) : null}
          <p className="text-sm text-[var(--ec-text-secondary)]" role="status" aria-live="polite">
            {saved}
          </p>
        </div>
      ) : null}
    </form>
  )
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * The class markbook as CSV — sets (one row per student per set) or every
 * marked attempt. Downloaded through fetch rather than a bare link so a
 * refused export (an archived class, a failed read) shows its reason here
 * instead of saving an error message as a .csv.
 */
export function ClassExportButtons({ classroomId, disabled = false }: { classroomId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState<'assignments' | 'attempts' | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function download(scope: 'assignments' | 'attempts') {
    if (busy) return
    setBusy(scope)
    setError('')
    setStatus('')
    try {
      const r = await downloadExport(
        `/api/teacher/classroom/${encodeURIComponent(classroomId)}/export?scope=${scope}`,
        `class-${scope}.csv`
      )
      if (!r.ok) {
        setError(r.error)
        return
      }
      setStatus(
        r.truncated
          ? 'Downloaded — this class has more rows than one file holds, so the oldest were left out.'
          : 'Downloaded.'
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="ms-teacher-settings__actions">
        <button
          type="button"
          onClick={() => void download('assignments')}
          disabled={disabled || busy !== null}
          aria-busy={busy === 'assignments' || undefined}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:opacity-60"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            CSV
          </span>
          {busy === 'assignments' ? 'Preparing…' : 'Sets markbook'}
        </button>
        <button
          type="button"
          onClick={() => void download('attempts')}
          disabled={disabled || busy !== null}
          aria-busy={busy === 'attempts' || undefined}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:opacity-60"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            CSV
          </span>
          {busy === 'attempts' ? 'Preparing…' : 'Every marked attempt'}
        </button>
      </div>
      {error ? <FormErrorAlert message={error} /> : null}
      <p className="text-sm text-[var(--ec-text-secondary)]" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

type DangerAction = 'archive' | 'restore' | 'delete'

/**
 * Archive (reversible), restore, and delete (irreversible, and only once the
 * class is archived and empty — the server enforces both; this explains
 * them). Each goes through a confirm dialog; delete also asks for the class
 * name typed out, because it takes every set and retained mark with it.
 */
export function ClassroomDangerZone({
  classroom,
}: {
  classroom: { id: string; name: string; archived_at: string | null; activeMembers: number }
}) {
  const router = useRouter()
  const [action, setAction] = useState<DangerAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const [announce, setAnnounce] = useState('')
  const confirmInputId = useId()
  const archived = classroom.archived_at !== null
  const canDelete = archived && classroom.activeMembers === 0

  function open(next: DangerAction) {
    setError('')
    setTyped('')
    setAction(next)
  }

  async function run() {
    if (!action || busy) return
    setBusy(true)
    setError('')
    try {
      const res =
        action === 'restore'
          ? await fetch(`/api/teacher/classroom/${classroom.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ archived: false }),
            })
          : await fetch(`/api/teacher/classroom/${classroom.id}?mode=${action}`, { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'That did not work. Try again.')
        return
      }
      if (action === 'delete') {
        router.push('/teacher/classrooms')
        router.refresh()
        return
      }
      setAnnounce(action === 'archive' ? 'Class archived.' : 'Class restored.')
      setAction(null)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const nameMatches = typed.trim() === classroom.name.trim()

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {!archived ? (
        <div className="ms-teacher-danger__row">
          <div className="ms-teacher-danger__copy">
            <p className="ms-teacher-danger__label">Archive this class</p>
            <p className="ms-teacher-danger__hint">
              For a class that has finished. Nobody can join, students stop seeing its sets, and you stop
              seeing their new work. Marks already handed in are kept, and you can restore it any time.
            </p>
          </div>
          <button type="button" className="ms-teacher-danger__btn" onClick={() => open('archive')}>
            Archive class
          </button>
        </div>
      ) : (
        <div className="ms-teacher-danger__row">
          <div className="ms-teacher-danger__copy">
            <p className="ms-teacher-danger__label">Restore this class</p>
            <p className="ms-teacher-danger__hint">
              Brings it back to your desk. Its students see its sets again and can hand in work.
            </p>
          </div>
          <button
            type="button"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center"
            onClick={() => open('restore')}
          >
            Restore class
          </button>
        </div>
      )}

      <div className="ms-teacher-danger__row">
        <div className="ms-teacher-danger__copy">
          <p className="ms-teacher-danger__label">Delete this class</p>
          <p className="ms-teacher-danger__hint">
            {canDelete
              ? 'Deletes the class, its sets and every mark handed in to them. This cannot be undone.'
              : !archived
                ? 'Archive the class first. Deleting removes its sets and every mark handed in to them, for good.'
                : `Remove the ${classroom.activeMembers === 1 ? 'last student' : `${classroom.activeMembers} students`} still in it first (class list above) — deleting would take their handed-in marks with it.`}
          </p>
        </div>
        <button
          type="button"
          className="ms-teacher-danger__btn"
          disabled={!canDelete}
          aria-disabled={!canDelete || undefined}
          onClick={() => open('delete')}
        >
          Delete for good
        </button>
      </div>

      <TeacherConfirmDialog
        open={action === 'archive'}
        onClose={() => (busy ? undefined : setAction(null))}
        title={`Archive ${classroom.name}?`}
        confirmLabel="Archive class"
        busyLabel="Archiving…"
        busy={busy}
        error={error}
        onConfirm={() => void run()}
      >
        <p className="ms-teacher-confirm__body">
          The invite code stops working, students stop seeing the class&apos;s sets, and it moves to
          Archived on your desk. Nothing is deleted — restore it whenever you like.
        </p>
      </TeacherConfirmDialog>

      <TeacherConfirmDialog
        open={action === 'restore'}
        onClose={() => (busy ? undefined : setAction(null))}
        title={`Restore ${classroom.name}?`}
        confirmLabel="Restore class"
        busyLabel="Restoring…"
        busy={busy}
        error={error}
        tone="primary"
        onConfirm={() => void run()}
      >
        <p className="ms-teacher-confirm__body">
          The class returns to your desk and its students see its sets again. Make a new invite code in
          settings if new students need to join.
        </p>
      </TeacherConfirmDialog>

      <TeacherConfirmDialog
        open={action === 'delete'}
        onClose={() => (busy ? undefined : setAction(null))}
        title={`Delete ${classroom.name}?`}
        confirmLabel="Delete for good"
        busyLabel="Deleting…"
        busy={busy}
        error={error}
        confirmDisabled={!nameMatches}
        onConfirm={() => void run()}
      >
        <p className="ms-teacher-confirm__body">
          This deletes the class, every set in it and every mark handed in to those sets. It cannot be
          undone. Students keep their own marked work in their accounts.
        </p>
        <div className="mt-4">
          <label htmlFor={confirmInputId} className="ms-teacher-start__legend">
            Type the class name to confirm
          </label>
          <input
            id={confirmInputId}
            className="ec-input ms-teacher-start__input mt-2"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={classroom.name}
          />
        </div>
      </TeacherConfirmDialog>
    </>
  )
}
