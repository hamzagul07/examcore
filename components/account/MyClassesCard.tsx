'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { CLASS_RETENTION_NOTE } from '@/lib/student/join'
import type { MyClass } from '@/lib/student/assignments'

/**
 * Account → My classes (docs/TEACHER_SYSTEM_SPEC.md §4 `/account`,
 * `.ms-my-classes`): each class the student is in, who teaches it (first name
 * and initial), when they joined, the class bonus when the teacher's seat
 * adds one, and Leave.
 *
 * Leave asks first and says exactly what it does — the teacher stops seeing
 * new work, keeps the marks already handed in on sets, and the class's sets
 * leave the student's dashboard — then calls POST
 * /api/classrooms/[id]/leave (the `leave_classroom` RPC). The row goes from
 * the list at once and the page refreshes from the server behind it.
 */
export function MyClassesCard({ classes, timeZone }: { classes: MyClass[]; timeZone?: string }) {
  const router = useRouter()
  const titleId = useId()
  const [rows, setRows] = useState(classes)
  const [leaving, setLeaving] = useState<MyClass | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')

  async function leave() {
    if (!leaving || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classrooms/${encodeURIComponent(leaving.id)}/leave`, { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      // 404 means they are already out of it (another tab, or the teacher
      // removed them): the class should leave this list either way.
      if (!res.ok && res.status !== 404) {
        setError(data.error || 'Could not leave the class. Try again.')
        return
      }
      setRows((list) => list.filter((c) => c.id !== leaving.id))
      setAnnounce(`You left ${leaving.name}.`)
      setLeaving(null)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  // The bonus is per student, not per class: two verified classes do not
  // stack, and leaving one of them only ends it if it was the last.
  const bonusClasses = rows.filter((c) => c.class_bonus > 0).length
  const losesBonus = leaving !== null && leaving.class_bonus > 0 && bonusClasses === 1

  return (
    <SettingsSectionCard title="My classes" description="Classes you joined with a code from your teacher.">
      <div className="ms-my-classes">
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
        {rows.length === 0 ? (
          <p className="text-body">
            You&apos;re not in a class now.{' '}
            <Link href="/join" className="font-semibold text-[var(--ec-brand)] underline-offset-2 hover:underline">
              Join a class
            </Link>
          </p>
        ) : (
          <ul className="ms-my-classes__list">
            {rows.map((c) => (
              <li key={c.id} className="ms-my-classes__row">
                <div className="ms-my-classes__who">
                  <p className="ms-my-classes__name">{c.name}</p>
                  <p className="ms-my-classes__meta">
                    {[c.subject, `with ${c.teacher_display_name}`].filter(Boolean).join(' · ')}
                    {c.joined_at ? (
                      <>
                        {' · joined '}
                        <LocalTime iso={c.joined_at} variant="date" timeZone={timeZone} />
                      </>
                    ) : null}
                  </p>
                  {c.class_bonus > 0 ? (
                    <p className="ms-my-classes__bonus">
                      {bonusClasses > 1
                        ? `Counts toward your +${c.class_bonus} marks a month class bonus`
                        : `+${c.class_bonus} marks a month from this class`}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ms-my-classes__leave"
                  onClick={() => {
                    setError('')
                    setLeaving(c)
                  }}
                  aria-label={`Leave ${c.name}`}
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="ms-my-classes__retention">{CLASS_RETENTION_NOTE}</p>
      </div>

      <Dialog open={leaving !== null} onClose={() => (busy ? undefined : setLeaving(null))} labelledById={titleId}>
        <h2 id={titleId} className="text-h3 mb-3 pr-10 text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
          Leave {leaving?.name ?? 'this class'}?
        </h2>
        <div className="text-body space-y-3">
          <p>
            {leaving?.teacher_display_name ?? 'Your teacher'} stops seeing work you mark from now on, and the
            class&apos;s sets leave your dashboard straight away.
          </p>
          <p>They keep the marks for sets you already handed in. Your own marked work stays in your account.</p>
          {losesBonus ? (
            <p>
              You&apos;ll also lose the +{leaving?.class_bonus} marks a month this class adds to your allowance.
            </p>
          ) : null}
          <p>You can rejoin later with the class code.</p>
        </div>
        {error ? <FormErrorAlert message={error} className="mt-4" /> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setLeaving(null)} disabled={busy}>
            Stay in class
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => void leave()}
            loading={busy}
            loadingText="Leaving…"
          >
            Leave class
          </Button>
        </div>
      </Dialog>
    </SettingsSectionCard>
  )
}
