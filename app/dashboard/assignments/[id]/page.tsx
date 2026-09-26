import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Eye } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { MathText } from '@/components/MathText'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import {
  SET_VISIBILITY_NOTE,
  formatMark,
  isUuid,
  kindLabel,
  loadStudentAssignment,
  pctLabel,
  progressLabel,
  studentRequestTimeZone,
  type StudentFeedbackNote,
  type StudentSetItem,
} from '@/lib/student/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { SetChip } from '../_components/SetChip'
import { MarkFeedbackRead } from '../_components/MarkFeedbackRead'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Set by your teacher',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

/** The result stamp for a handed-in item, in the teacher's matrix vocabulary. */
function ResultStamp({ item }: { item: StudentSetItem }) {
  const sub = item.submission
  if (!sub) return null
  const earned = sub.marks_earned
  const total = sub.total_marks ?? item.total_marks
  const score = earned !== null && total !== null ? `${formatMark(earned)}/${formatMark(total)}` : null
  const [prefix, tone, spoken] =
    item.state === 'reviewed'
      ? ['RV', 'ec-mark-stamp--ok', 'Reviewed by your teacher']
      : item.state === 'late'
        ? ['L', 'ec-mark-stamp--no', 'Handed in late']
        : ['✓', 'ec-mark-stamp--ok', 'Handed in']
  const label = score ? `${spoken}: ${score.replace('/', ' out of ')}` : spoken
  const stamp = (
    <span className={`ec-mark-stamp ${tone}`} aria-hidden>
      {prefix} {score ?? ''}
    </span>
  )
  return item.attempt_href ? (
    <Link
      href={item.attempt_href}
      className="inline-flex min-h-[44px] items-center rounded-[4px] px-1 focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label={`${label}. Open the marked script`}
    >
      {stamp}
    </Link>
  ) : (
    <span className="inline-flex min-h-[44px] items-center px-1" role="img" aria-label={label}>
      {stamp}
    </span>
  )
}

function NoteSlip({ note, timeZone }: { note: StudentFeedbackNote; timeZone: string }) {
  return (
    <aside className="ms-feedback-note mt-3">
      <p className="ms-feedback-note__label">
        From {note.teacher_display_name}
        {note.read_at ? null : <span className="ml-2 text-[var(--ec-ink-crimson)]">· New</span>}
      </p>
      <p className="ms-feedback-note__body">{note.body}</p>
      <p className="ms-feedback-note__meta">
        <LocalTime iso={note.created_at} variant="date" timeZone={timeZone} />
        {' · '}
        <Link href={`/dashboard/attempt/${encodeURIComponent(note.attempt_id)}`} className="underline-offset-2 hover:underline">
          See the marked script
        </Link>
      </p>
    </aside>
  )
}

function itemTitle(item: StudentSetItem): string {
  if (item.item_type === 'prompt') return 'Your teacher’s question'
  if (item.item_type === 'whole_paper') return item.reference ? `Whole paper · ${item.reference}` : 'Whole paper'
  return item.reference ?? 'Past-paper question'
}

/**
 * `/dashboard/assignments/[id]` — one set as its student sees it
 * (docs/TEACHER_SYSTEM_SPEC.md §4): instructions; the items as `.ec-exam-sheet`
 * rows, each with "Mark this" (`mark_href`, which hands the mark in against
 * the item) or the result stamp; the teacher's notes as margin notes; and the
 * notice that marks on the set are visible to the teacher. 404 for a set the
 * student may not see — the loader's RLS read decides, and the page does not
 * say why.
 */
export default async function StudentSetPage({ params }: Props) {
  if (!isTeacherV2()) notFound()
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(`/dashboard/assignments/${id}`)}`)
  if (!isUuid(id)) notFound()

  const detail = await loadStudentAssignment(supabase, createServiceClient(), user.id, id)
  if (!detail) notFound()

  const timeZone = await studentRequestTimeZone()
  const { assignment, classroom, summary, items, flags, feedback, class_average } = detail
  const notesByItem = new Map<string, StudentFeedbackNote[]>()
  const looseNotes: StudentFeedbackNote[] = []
  for (const note of feedback) {
    if (note.item_id && items.some((i) => i.id === note.item_id)) {
      notesByItem.set(note.item_id, [...(notesByItem.get(note.item_id) ?? []), note])
    } else {
      looseNotes.push(note)
    }
  }
  const unread = feedback.filter((n) => !n.read_at).map((n) => n.id)
  const itemTotals = items.map((i) => i.total_marks)
  const totalMarks = itemTotals.every((t): t is number => typeof t === 'number') && items.length > 0
    ? itemTotals.reduce((a, b) => a + (b as number), 0)
    : null
  const own = pctLabel(summary.overall_pct)
  const timed = assignment.settings.timed_minutes

  return (
    <main className="app-shell app-shell-tabbed">
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-10">
        <Link
          href="/dashboard/assignments"
          className="ec-card ec-card--paper mb-8 inline-flex min-h-[44px] items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          Your sets
        </Link>

        <header className="mb-6">
          <p className="ms-overline mb-3 [overflow-wrap:anywhere]">
            {[classroom.name, classroom.subject_label].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-hero text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">{assignment.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SetChip set={summary} />
            <span className="ec-chip-ms ec-chip-ms--outline">{kindLabel(assignment.kind)}</span>
            {assignment.is_mock ? <span className="ec-chip-ms ec-chip-ms--outline">Mock</span> : null}
            {typeof timed === 'number' && timed > 0 ? (
              <span className="ec-chip-ms ec-chip-ms--outline">Timed · {timed} min</span>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-1 text-sm text-[var(--ec-text-secondary)]">
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-[var(--ec-text-primary)]">Set by</dt>
              <dd className="m-0">{classroom.teacher_display_name}</dd>
            </div>
            {summary.deadline ? (
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-[var(--ec-text-primary)]">
                  {summary.extended ? 'Your deadline' : 'Due'}
                </dt>
                <dd className="m-0">
                  <LocalTime iso={summary.deadline} variant="long" timeZone={timeZone} />
                  {summary.extended ? ' — extended by your teacher' : ''}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-1.5">
              <dt className="font-semibold text-[var(--ec-text-primary)]">Progress</dt>
              <dd className="m-0">
                {progressLabel(summary)}
                {own ? ` · your mark so far ${own}` : ''}
              </dd>
            </div>
            {class_average ? (
              <div className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-[var(--ec-text-primary)]">Class average</dt>
                <dd className="m-0">
                  {pctLabel(class_average.pct)} across {class_average.n} students
                </dd>
              </div>
            ) : null}
          </dl>
        </header>

        <p
          role="note"
          className="mb-6 flex items-start gap-2 rounded-[4px] border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] px-4 py-3 text-sm text-[var(--ec-text-secondary)]"
        >
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-text-secondary)]" aria-hidden />
          <span>
            {SET_VISIBILITY_NOTE} Your best mark on each question is the one that counts.
          </span>
        </p>

        {summary.state === 'excused' ? (
          <p className="mb-6 text-sm text-[var(--ec-text-secondary)]" role="status">
            Your teacher excused you from this set. You can still hand work in if you want to.
          </p>
        ) : null}
        {summary.state === 'missed' ? (
          <p className="mb-6 text-sm text-[var(--ec-text-secondary)]" role="status">
            {summary.can_hand_in
              ? 'This set has closed, but your teacher still accepts late work on it.'
              : 'This set has closed and your teacher is not accepting more work on it.'}
          </p>
        ) : null}

        {flags?.feedback?.trim() ? (
          <aside className="ms-feedback-note mb-6">
            <p className="ms-feedback-note__label">Note from {classroom.teacher_display_name}</p>
            <p className="ms-feedback-note__body">{flags.feedback}</p>
            {flags.feedback_at ? (
              <p className="ms-feedback-note__meta">
                <LocalTime iso={flags.feedback_at} variant="date" timeZone={timeZone} />
              </p>
            ) : null}
          </aside>
        ) : null}

        {assignment.instructions ? (
          <section aria-labelledby="set-instructions" className="ec-card ec-card--paper mb-6 p-4 sm:p-5">
            <h2 id="set-instructions" className="ms-overline mb-2">
              Instructions
            </h2>
            <p className="m-0 whitespace-pre-wrap leading-relaxed text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
              {assignment.instructions}
            </p>
          </section>
        ) : null}

        <article className="ec-exam-sheet" aria-labelledby="set-sheet-title">
          <header className="ec-exam-sheet__head">
            <span id="set-sheet-title" className="min-w-0 truncate">
              {items.length} {items.length === 1 ? 'question' : 'questions'}
            </span>
            {totalMarks !== null ? <span>{formatMark(totalMarks)} marks</span> : null}
          </header>
          {items.length === 0 ? (
            <p className="py-4 text-sm text-[var(--ec-text-secondary)]">Your teacher hasn&apos;t added anything to this set yet.</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {items.map((item) => {
                const itemNotes = notesByItem.get(item.id) ?? []
                const handedIn = item.submission !== null
                return (
                  <li
                    key={item.id}
                    className="ec-exam-sheet__line flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-start"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-mono text-xs text-[var(--ec-text-faint)] [overflow-wrap:anywhere]">
                        <span className="font-bold text-[var(--ec-text-primary)]">{item.number}.</span> {itemTitle(item)}
                        {typeof item.total_marks === 'number' ? ` · ${formatMark(item.total_marks)} marks` : ''}
                      </p>
                      {item.preview ? (
                        <div className="mt-1.5 text-sm leading-relaxed text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
                          <MathText text={item.preview} />
                        </div>
                      ) : null}
                      {item.state === 'excused' ? (
                        <p className="mt-1.5 text-xs text-[var(--ec-text-secondary)]">Excused — optional for you.</p>
                      ) : null}
                      {itemNotes.map((note) => (
                        <NoteSlip key={note.id} note={note} timeZone={timeZone} />
                      ))}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[45%] sm:justify-end">
                      <ResultStamp item={item} />
                      {item.mark_href ? (
                        <LoadingLink
                          href={item.mark_href}
                          loadingText="Opening…"
                          className={`${handedIn ? 'ec-btn-secondary' : 'ec-btn-primary'} inline-flex min-h-[44px] items-center justify-center px-5 text-sm`}
                          aria-label={handedIn ? `Try again: question ${item.number}` : `Mark this: question ${item.number}`}
                        >
                          {handedIn ? 'Try again' : 'Mark this'}
                        </LoadingLink>
                      ) : !handedIn ? (
                        <span className="text-xs text-[var(--ec-text-faint)]">Not handed in</span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </article>

        {looseNotes.length > 0 ? (
          <section aria-labelledby="set-notes" className="mt-8">
            <h2 id="set-notes" className="ms-overline mb-1">
              Notes from your teacher
            </h2>
            {looseNotes.map((note) => (
              <NoteSlip key={note.id} note={note} timeZone={timeZone} />
            ))}
          </section>
        ) : null}

        <MarkFeedbackRead ids={unread} />
      </div>
    </main>
  )
}
