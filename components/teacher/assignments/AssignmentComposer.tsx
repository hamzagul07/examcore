'use client'

import { useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  INSTRUCTIONS_MAX,
  MAX_ITEMS,
  PROMPT_MAX,
  TITLE_MAX,
  parseAssignmentDraft,
} from '@/lib/teacher/assignments/validate'
import type { AssignmentKind } from '@/lib/teacher/types'
import { UNVERIFIED_SEAT_STUDENT_NOTE } from '@/lib/billing/teacher-seat'
import { Button } from '@/components/ui/Button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DueDatePicker } from '@/components/teacher/assignments/DueDatePicker'
import { QuestionPicker, WholePaperPicker } from '@/components/teacher/assignments/QuestionPicker'
import { TopicPicker } from '@/components/teacher/assignments/TopicPicker'
import {
  buildDraftBody,
  buildPatchBody,
  composerIssue,
  composerStep,
  itemIndex,
  parsePromptMarks,
  parseTimedMinutes,
  questionCount,
  topicIndex,
  topicLabel,
  type Choice,
  type ChoiceGroup,
  type ComposerPrefill,
  type ComposerState,
  type ComposerStep,
  type PickedQuestion,
  type TopicGroup,
} from '@/components/teacher/assignments/composer-model'
import { FALLBACK_TIME_ZONE, formatDueLong, safeTimeZone } from '@/components/teacher/assignments/format'
import { setHref } from '@/components/teacher/assignments/links'
import { shortSession } from '@/components/teacher/assignments/matrix-cells'
import { KIND_LABEL } from '@/components/teacher/assignments/set-display'

export type ComposerStudent = { id: string; name: string }

type FieldError = { field: string; message: string }

const KIND_OPTIONS: Array<{ value: AssignmentKind; label: string }> = [
  { value: 'question_set', label: 'Questions' },
  { value: 'topic_drill', label: 'Topic drill' },
  { value: 'whole_paper', label: 'Whole paper' },
  { value: 'practice_prompt', label: 'Own prompt' },
]

const KIND_HINT: Record<AssignmentKind, string> = {
  question_set: 'Pick past-paper questions from a paper, or from every paper by topic.',
  topic_drill: 'Pick topics; we choose the banked questions for each when you publish.',
  whole_paper: 'Set a full past paper, sat as one script.',
  practice_prompt: 'Write your own question. Students mark their answer against it on /mark.',
}

const noSubscribe = () => () => {}

function browserTimeZone(): string {
  try {
    return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

function Step({
  id,
  num,
  title,
  hint,
  invalid,
  children,
}: {
  id: string
  num: number
  title: string
  hint?: ReactNode
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <section
      className="ms-set-composer__step"
      aria-labelledby={`${id}-title`}
      data-invalid={invalid ? 'true' : undefined}
      id={id}
      tabIndex={-1}
      style={invalid ? { borderColor: 'var(--ec-logo-crimson)' } : undefined}
    >
      <header className="ms-set-composer__step-head">
        <span className="ms-set-composer__step-num" aria-hidden>
          {num}
        </span>
        <h2 id={`${id}-title`} className="ms-set-composer__legend">
          <span className="sr-only">Step {num}: </span>
          {title}
        </h2>
      </header>
      {hint ? <p className="ms-set-composer__hint">{hint}</p> : null}
      {children}
    </section>
  )
}

function Switch({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label htmlFor={id} className="ms-teacher-settings__toggle">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        <small>{hint}</small>
      </span>
    </label>
  )
}

/**
 * Set work (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/new`,
 * `.ms-set-composer`): What (kind, then the question / topic / paper /
 * prompt picker) · Who (the whole class or picked students) · When (due
 * date with quick chips, timer, mock, late work) · the review slip, then
 * Publish or Save draft.
 *
 * It opens prefilled from a card's link (`?source=&codes=&students=`, parsed
 * on the server into `prefill`) and posts AssignmentDraftInput to
 * `POST T/assignments`, having first run the route's own parser over the body
 * so mistakes are shown beside the step they belong to. A refused field from
 * the server lands in the same place. On success it opens the new set.
 *
 * With `draft`, it edits a saved draft instead: Save draft PATCHes it,
 * Publish PATCHes then publishes it. What kind of set it is and who it is
 * for are fixed once saved (the PATCH route takes neither), so those two
 * controls are read-only there.
 */
export function AssignmentComposer({
  classroomId,
  subjectCode,
  subjectLabel,
  students,
  papers,
  topics,
  prefill,
  teacherVerified,
  draft,
}: {
  classroomId: string
  subjectCode: string
  subjectLabel: string
  /** Active members, A–Z, with the names the teacher knows them by. */
  students: readonly ComposerStudent[]
  papers: { components: ChoiceGroup[]; sessions: Choice[] }
  topics: readonly TopicGroup[]
  prefill: ComposerPrefill
  teacherVerified: boolean
  /** Edit this saved draft rather than create a set. */
  draft?: { assignmentId: string; initial: ComposerState; targetLabel: string }
}) {
  const router = useRouter()
  const uid = useId()
  const names = useMemo(() => topicIndex(topics), [topics])
  const tz = useSyncExternalStore(noSubscribe, browserTimeZone, () => FALLBACK_TIME_ZONE)
  // Prompt keys feed element ids, so they must match between the server
  // render and hydration: a per-component counter, not a module one.
  const promptSeq = useRef(draft ? draft.initial.prompts.length : 1)
  const newPromptKey = () => `p${promptSeq.current++}`

  const [state, setState] = useState<ComposerState>(() => draft?.initial ?? {
    title: prefill.title,
    instructions: '',
    kind: prefill.kind,
    questions: [],
    topics: prefill.topicCodes.map((code) => ({ code, per_topic: 2 })),
    papers: [],
    prompts: [{ key: 'p0', text: '', marks: '' }],
    target: prefill.studentIds.length > 0 ? 'picked' : 'all',
    studentIds: prefill.studentIds,
    dueAt: null,
    timedMinutes: '',
    isMock: false,
    allowLate: true,
  })
  const [error, setError] = useState<FieldError | null>(null)
  const [submitting, setSubmitting] = useState<'publish' | 'draft' | null>(null)
  const [status, setStatus] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
    setError(null)
  }

  const count = questionCount(state)
  const remaining = MAX_ITEMS - count
  const errorStep: ComposerStep | null = error ? composerStep(error.field) : null
  const badItem = error ? itemIndex(error.field) : null
  const fieldMessage = (field: string) => (error && error.field === field ? error.message : undefined)
  const stepMessage = (step: ComposerStep) =>
    error && errorStep === step && !['title', 'instructions', 'due_at', 'settings.timed_minutes'].includes(error.field)
      ? error.message
      : undefined

  function showError(next: FieldError) {
    setError(next)
    setStatus('')
    const step = composerStep(next.field)
    // Move to what needs fixing: the field itself where there is one, else its step.
    window.requestAnimationFrame(() => {
      if (next.field === 'title') {
        titleRef.current?.focus()
        return
      }
      const target =
        next.field === 'due_at'
          ? document.getElementById(`${uid}-due`)
          : next.field === 'settings.timed_minutes'
            ? document.getElementById(`${uid}-timed`)
            : step
              ? document.getElementById(`${uid}-${step === 'title' ? 'what' : step}`)
              : null
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus({ preventScroll: true })
    })
  }

  async function submit(publish: boolean) {
    if (submitting) return
    const issue = composerIssue(state)
    if (issue) return showError({ field: issue.field, message: issue.error })
    // The route's own rules, run here first. A draft's audience is fixed, so
    // it is checked as "whole class" (the route does not re-check it either).
    const body = buildDraftBody(draft ? { ...state, target: 'all' } : state, {
      publish,
      source: prefill.source,
      sourceRef: prefill.sourceRef,
    })
    const parsed = parseAssignmentDraft(body, new Date())
    if (!parsed.ok) return showError({ field: parsed.field, message: parsed.error })

    setSubmitting(publish ? 'publish' : 'draft')
    setError(null)
    setStatus(publish ? 'Publishing…' : 'Saving the draft…')
    const setsUrl = `/api/teacher/classroom/${encodeURIComponent(classroomId)}/assignments`
    const fail = (data: { error?: string; field?: string }, message: string) => {
      setSubmitting(null)
      showError({ field: data.field ?? 'body', message: data.error || message })
    }
    try {
      let assignmentId: string
      if (draft) {
        const res = await fetch(`${setsUrl}/${encodeURIComponent(draft.assignmentId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPatchBody(state)),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
        if (!res.ok) return fail(data, 'Could not save the draft.')
        assignmentId = draft.assignmentId
        if (publish) {
          const pub = await fetch(`${setsUrl}/${encodeURIComponent(assignmentId)}/publish`, { method: 'POST' })
          const pubData = (await pub.json().catch(() => ({}))) as { error?: string; field?: string }
          if (!pub.ok) {
            return fail(
              { field: pubData.field, error: pubData.error ? `Saved, but not published: ${pubData.error}` : undefined },
              'Saved, but not published. Try Publish again.'
            )
          }
        }
      } else {
        const res = await fetch(setsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = (await res.json().catch(() => ({}))) as {
          assignment?: { id: string }
          error?: string
          field?: string
        }
        if (!res.ok || !data.assignment?.id) {
          return fail(data, publish ? 'Could not publish the set. Nothing was sent.' : 'Could not save the draft.')
        }
        assignmentId = data.assignment.id
      }
      setStatus(publish ? 'Published — opening the set…' : 'Draft saved — opening it…')
      // Keep the buttons disabled while the set page loads: a second press
      // would create a second set.
      router.push(setHref(classroomId, assignmentId))
      router.refresh()
    } catch {
      setSubmitting(null)
      showError({ field: 'body', message: 'Could not reach the server. Check your connection and try again.' })
    }
  }

  // --- What ---------------------------------------------------------------

  const toggleQuestion = (q: PickedQuestion) => {
    const on = state.questions.some((x) => x.id === q.id)
    set('questions', on ? state.questions.filter((x) => x.id !== q.id) : [...state.questions, q])
  }

  const itemClass = (index: number) =>
    badItem === index
      ? 'flex flex-wrap items-center justify-between gap-2 rounded border-2 border-[var(--ec-logo-crimson)] px-3 py-2'
      : 'flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--ec-border)] px-3 py-2'

  const whatPicker = (() => {
    switch (state.kind) {
      case 'question_set':
        return (
          <>
            {state.questions.length > 0 ? (
              <div className="mb-4">
                <p className="ms-set-composer__label mb-2">
                  In this set ({state.questions.length} of {MAX_ITEMS})
                </p>
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {state.questions.map((q, i) => {
                    const ref = `${q.paper_code} · ${shortSession(q.paper_session)} · Q${q.question_number}`
                    return (
                      <li key={q.id} className={itemClass(i)}>
                        <span className="min-w-0 flex-1 font-mono text-xs font-bold text-[var(--ec-text-primary)]">
                          {i + 1}. {ref}
                          {q.total_marks !== null ? ` [${q.total_marks}]` : ''}
                        </span>
                        <button
                          type="button"
                          className="ec-btn-ghost inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm"
                          onClick={() => toggleQuestion(q)}
                          aria-label={`Remove ${ref}`}
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ) : null}
            <QuestionPicker
              subjectCode={subjectCode}
              papers={papers}
              topics={topics}
              selected={state.questions}
              onToggle={toggleQuestion}
              remaining={remaining}
            />
          </>
        )
      case 'topic_drill':
        return (
          <TopicPicker
            tree={topics}
            names={names}
            selected={state.topics}
            onChange={(next) => set('topics', next)}
            remaining={remaining}
          />
        )
      case 'whole_paper':
        return (
          <>
            {state.papers.length > 0 ? (
              <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                {state.papers.map((p, i) => {
                  const ref = `${p.paper_code} · ${p.paper_session}`
                  return (
                    <li key={`${p.paper_code}|${p.paper_session}`} className={itemClass(i)}>
                      <span className="min-w-0 flex-1 font-mono text-xs font-bold text-[var(--ec-text-primary)]">
                        {ref}
                      </span>
                      <button
                        type="button"
                        className="ec-btn-ghost inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm"
                        onClick={() => set('papers', state.papers.filter((_, j) => j !== i))}
                        aria-label={`Remove ${ref}`}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            <WholePaperPicker
              subjectCode={subjectCode}
              papers={papers}
              picked={state.papers}
              full={remaining <= 0}
              onAdd={(p) => set('papers', [...state.papers, p])}
            />
          </>
        )
      case 'practice_prompt': {
        let filled = -1
        return (
          <div className="flex flex-col gap-4">
            {state.prompts.map((p, i) => {
              if (p.text.trim()) filled += 1
              const flagged = p.text.trim() !== '' && badItem === filled
              const marksBad = parsePromptMarks(p.marks) === 'invalid'
              const textId = `${uid}-prompt-${p.key}`
              const marksId = `${uid}-marks-${p.key}`
              return (
                <fieldset
                  key={p.key}
                  className="ms-set-composer__field rounded border border-[var(--ec-border)] p-3"
                  style={flagged ? { borderColor: 'var(--ec-logo-crimson)' } : undefined}
                >
                  <legend className="ms-set-composer__label px-1">Prompt {i + 1}</legend>
                  <label htmlFor={textId} className="sr-only">
                    Prompt {i + 1} text
                  </label>
                  <textarea
                    id={textId}
                    className="ec-input w-full resize-y"
                    rows={4}
                    maxLength={PROMPT_MAX}
                    value={p.text}
                    placeholder="e.g. Explain why the Fe²⁺/Fe³⁺ equilibrium shifts when…"
                    aria-invalid={flagged || undefined}
                    onChange={(e) =>
                      set(
                        'prompts',
                        state.prompts.map((x) => (x.key === p.key ? { ...x, text: e.target.value } : x))
                      )
                    }
                  />
                  <p className="ms-set-composer__hint mb-0">
                    {p.text.length}/{PROMPT_MAX} characters. Plain text; $…$ renders as maths.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={marksId} className="ms-set-composer__label">
                        Marks <span className="font-normal text-[var(--ec-text-secondary)]">(optional)</span>
                      </label>
                      <input
                        id={marksId}
                        inputMode="numeric"
                        className="ec-input min-h-[44px] w-24"
                        value={p.marks}
                        aria-invalid={marksBad || undefined}
                        aria-describedby={marksBad ? `${marksId}-error` : undefined}
                        onChange={(e) =>
                          set(
                            'prompts',
                            state.prompts.map((x) => (x.key === p.key ? { ...x, marks: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    {state.prompts.length > 1 ? (
                      <button
                        type="button"
                        className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
                        onClick={() => set('prompts', state.prompts.filter((x) => x.key !== p.key))}
                      >
                        Remove prompt {i + 1}
                      </button>
                    ) : null}
                  </div>
                  {marksBad ? (
                    <p id={`${marksId}-error`} className="ms-set-composer__hint mb-0 text-[var(--ec-ink-crimson)]">
                      A whole number from 1 to 100.
                    </p>
                  ) : null}
                </fieldset>
              )
            })}
            {state.prompts.length < MAX_ITEMS ? (
              <div>
                <button
                  type="button"
                  className="ec-btn-secondary inline-flex min-h-[44px] items-center"
                  onClick={() => set('prompts', [...state.prompts, { key: newPromptKey(), text: '', marks: '' }])}
                >
                  Add another prompt
                </button>
              </div>
            ) : null}
          </div>
        )
      }
    }
  })()

  // --- Who ----------------------------------------------------------------

  const picked = new Set(state.studentIds)
  const filteredStudents = studentFilter.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(studentFilter.trim().toLowerCase()))
    : students
  const toggleStudent = (id: string) =>
    set('studentIds', picked.has(id) ? state.studentIds.filter((x) => x !== id) : [...state.studentIds, id])

  // --- Review ---------------------------------------------------------------

  const whatSummary = (() => {
    switch (state.kind) {
      case 'question_set':
        return `${count} ${count === 1 ? 'question' : 'questions'}`
      case 'topic_drill':
        return state.topics.length
          ? `${count} questions from ${state.topics.map((t) => topicLabel(t.code, names)).join(', ')}`
          : 'No topics yet'
      case 'whole_paper':
        return state.papers.length ? state.papers.map((p) => `${p.paper_code} ${p.paper_session}`).join('; ') : 'No paper yet'
      case 'practice_prompt': {
        const n = state.prompts.filter((p) => p.text.trim()).length
        return `${n} ${n === 1 ? 'prompt' : 'prompts'}`
      }
    }
  })()
  const pickedNames = students.filter((s) => picked.has(s.id)).map((s) => s.name)
  const whoSummary =
    state.target === 'all'
      ? `The whole class (${students.length} ${students.length === 1 ? 'student' : 'students'})`
      : pickedNames.length === 0
        ? 'Nobody picked yet'
        : `${pickedNames.length} picked: ${pickedNames.slice(0, 4).join(', ')}${pickedNames.length > 4 ? `, +${pickedNames.length - 4}` : ''}`
  const timed = parseTimedMinutes(state.timedMinutes)
  const dueText = state.dueAt ? formatDueLong(state.dueAt, tz) : null

  return (
    <form
      className="ms-set-composer"
      noValidate
      aria-busy={submitting ? true : undefined}
      onSubmit={(e) => {
        e.preventDefault()
        void submit(true)
      }}
    >
      {!draft && (prefill.droppedStudents > 0 || prefill.droppedCodes > 0) ? (
        <p className="ms-set-composer__allowance" role="status">
          {prefill.droppedStudents > 0
            ? `${prefill.droppedStudents} ${prefill.droppedStudents === 1 ? 'student' : 'students'} from that card ${
                prefill.droppedStudents === 1 ? 'is' : 'are'
              } no longer in this class, so ${prefill.droppedStudents === 1 ? 'was' : 'were'} left out. `
            : ''}
          {prefill.droppedCodes > 0
            ? `${prefill.droppedCodes} ${prefill.droppedCodes === 1 ? 'topic is' : 'topics are'} not in this class’s syllabus, so ${
                prefill.droppedCodes === 1 ? 'it was' : 'they were'
              } left out.`
            : ''}
        </p>
      ) : null}

      <Step id={`${uid}-what`} num={1} title="What" hint={`${subjectLabel}. ${KIND_HINT[state.kind]}`} invalid={errorStep === 'what' || errorStep === 'title'}>
        <div className="ms-set-composer__field">
          <label htmlFor={`${uid}-title-input`} className="ms-set-composer__label">
            Title
          </label>
          <input
            ref={titleRef}
            id={`${uid}-title-input`}
            className="ec-input min-h-[44px] w-full"
            value={state.title}
            maxLength={TITLE_MAX}
            placeholder="e.g. Integration homework"
            autoComplete="off"
            aria-invalid={fieldMessage('title') ? true : undefined}
            aria-describedby={fieldMessage('title') ? `${uid}-title-error` : undefined}
            onChange={(e) => set('title', e.target.value)}
          />
          {fieldMessage('title') ? (
            <p id={`${uid}-title-error`} className="ms-teacher-start__error" role="alert">
              {fieldMessage('title')}
            </p>
          ) : null}
        </div>

        <div className="ms-set-composer__field">
          <label htmlFor={`${uid}-instructions`} className="ms-set-composer__label">
            Instructions <span className="font-normal text-[var(--ec-text-secondary)]">(optional)</span>
          </label>
          <textarea
            id={`${uid}-instructions`}
            className="ec-input w-full resize-y"
            rows={3}
            maxLength={INSTRUCTIONS_MAX}
            value={state.instructions}
            placeholder="What students should do, and anything to watch out for."
            aria-invalid={fieldMessage('instructions') ? true : undefined}
            onChange={(e) => set('instructions', e.target.value)}
          />
          {fieldMessage('instructions') ? (
            <p className="ms-teacher-start__error" role="alert">
              {fieldMessage('instructions')}
            </p>
          ) : null}
        </div>

        <div className="ms-set-composer__field">
          <p id={`${uid}-kind-label`} className="ms-set-composer__label">
            Kind of work
          </p>
          <SegmentedControl<AssignmentKind>
            value={state.kind}
            onChange={(kind) => set('kind', kind)}
            options={KIND_OPTIONS}
            aria-labelledby={`${uid}-kind-label`}
            aria-describedby={draft ? `${uid}-kind-fixed` : undefined}
            className="ms-teacher-start__choices"
            optionClassName="ms-teacher-start__choice"
            disabled={Boolean(draft)}
          />
          {draft ? (
            <p id={`${uid}-kind-fixed`} className="ms-set-composer__hint mb-0">
              The kind of work is fixed once a set is saved.
            </p>
          ) : null}
        </div>

        {whatPicker}

        {stepMessage('what') ? (
          <p className="ms-teacher-start__error mt-3" role="alert">
            {stepMessage('what')}
          </p>
        ) : null}
      </Step>

      <Step
        id={`${uid}-who`}
        num={2}
        title="Who"
        hint={students.length === 0 ? 'Nobody has joined yet — the set will be waiting for students when they join.' : undefined}
        invalid={errorStep === 'who'}
      >
        {draft ? (
          <p className="m-0 text-sm text-[var(--ec-text-primary)]">
            {draft.targetLabel}
            <span className="ms-set-composer__hint mt-1 block">
              Who a set is for is fixed once it is saved. To set it for different students, delete this draft and
              set the work again.
            </span>
          </p>
        ) : (
          <SegmentedControl<'all' | 'picked'>
            value={state.target}
            onChange={(target) => set('target', target)}
            options={[
              { value: 'all', label: `Whole class (${students.length})` },
              { value: 'picked', label: 'Pick students', disabled: students.length === 0 },
            ]}
            aria-label="Who the set is for"
            className="ms-teacher-start__choices"
            optionClassName="ms-teacher-start__choice"
          />
        )}
        {!draft && state.target === 'picked' ? (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              {students.length > 12 ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={`${uid}-student-filter`} className="ms-set-composer__label">
                    Find a student
                  </label>
                  <input
                    id={`${uid}-student-filter`}
                    type="search"
                    className="ec-input min-h-[44px] w-full"
                    value={studentFilter}
                    autoComplete="off"
                    onChange={(e) => setStudentFilter(e.target.value)}
                  />
                </div>
              ) : null}
              <button
                type="button"
                className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
                onClick={() => set('studentIds', [...new Set([...state.studentIds, ...filteredStudents.map((s) => s.id)])])}
              >
                Select {studentFilter.trim() ? 'these' : 'all'}
              </button>
              <button
                type="button"
                className="ec-btn-ghost inline-flex min-h-[44px] items-center text-sm"
                onClick={() => set('studentIds', [])}
                disabled={state.studentIds.length === 0}
              >
                Clear
              </button>
            </div>
            <fieldset className="m-0 border-0 p-0">
              <legend className="sr-only">Students to set this for</legend>
              <ul className="ms-set-composer__picker">
                {filteredStudents.map((s) => {
                  const id = `${uid}-student-${s.id}`
                  return (
                    <li key={s.id}>
                      <label
                        htmlFor={id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded border border-[var(--ec-border)] px-3 py-2 text-sm text-[var(--ec-text-primary)]"
                      >
                        <input id={id} type="checkbox" checked={picked.has(s.id)} onChange={() => toggleStudent(s.id)} />
                        {s.name}
                      </label>
                    </li>
                  )
                })}
                {filteredStudents.length === 0 ? (
                  <li className="ms-set-composer__hint">No student matches “{studentFilter.trim()}”.</li>
                ) : null}
              </ul>
            </fieldset>
            <p className="ms-set-composer__hint mt-2 mb-0" aria-live="polite">
              {state.studentIds.length} {state.studentIds.length === 1 ? 'student' : 'students'} picked.
            </p>
          </div>
        ) : null}
        {stepMessage('who') ? (
          <p className="ms-teacher-start__error mt-3" role="alert">
            {stepMessage('who')}
          </p>
        ) : null}
      </Step>

      <Step id={`${uid}-when`} num={3} title="When" invalid={errorStep === 'when'}>
        <DueDatePicker
          id={`${uid}-due`}
          label="Due"
          value={state.dueAt}
          onChange={(iso) => set('dueAt', iso)}
          hint="Hand-ins after this are marked late. A set closes a week after its due date."
          error={fieldMessage('due_at')}
        />
        <div className="ms-set-composer__field">
          <label htmlFor={`${uid}-timed`} className="ms-set-composer__label">
            Time to aim for, in minutes <span className="font-normal text-[var(--ec-text-secondary)]">(optional)</span>
          </label>
          <input
            id={`${uid}-timed`}
            inputMode="numeric"
            className="ec-input min-h-[44px] w-28"
            value={state.timedMinutes}
            placeholder="e.g. 45"
            aria-invalid={fieldMessage('settings.timed_minutes') ? true : undefined}
            aria-describedby={`${uid}-timed-hint`}
            onChange={(e) => set('timedMinutes', e.target.value)}
          />
          <p id={`${uid}-timed-hint`} className="ms-set-composer__hint mb-0">
            Shown to students with the set. Leave empty for untimed work.
          </p>
          {fieldMessage('settings.timed_minutes') ? (
            <p className="ms-teacher-start__error" role="alert">
              {fieldMessage('settings.timed_minutes')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Switch
            id={`${uid}-mock`}
            checked={state.isMock}
            onChange={(v) => set('isMock', v)}
            label="This is a mock"
            hint="Stamped MOCK for students; the set page adds the class's grade spread."
          />
          <Switch
            id={`${uid}-late`}
            checked={state.allowLate}
            onChange={(v) => set('allowLate', v)}
            label="Accept work after the set closes"
            hint="Late hand-ins still count, marked L. Turn off to stop hand-ins once the set closes."
          />
        </div>
        {stepMessage('when') ? (
          <p className="ms-teacher-start__error mt-3" role="alert">
            {stepMessage('when')}
          </p>
        ) : null}
      </Step>

      <section className="ms-set-composer__review" aria-labelledby={`${uid}-review-title`}>
        <h2 id={`${uid}-review-title`} className="ms-set-composer__legend mb-3">
          Check before you publish
        </h2>
        <dl>
          <dt>Title</dt>
          <dd>{state.title.trim() || 'Untitled'}</dd>
          <dt>What</dt>
          <dd>
            {KIND_LABEL[state.kind]} · {whatSummary}
          </dd>
          <dt>For</dt>
          <dd>{whoSummary}</dd>
          <dt>Due</dt>
          <dd>{dueText ?? 'No due date'}</dd>
          <dt>Timed</dt>
          <dd>{typeof timed === 'number' ? `${timed} minutes` : 'Untimed'}</dd>
          {state.isMock ? (
            <>
              <dt>Mock</dt>
              <dd>Yes</dd>
            </>
          ) : null}
          <dt>Late work</dt>
          <dd>{state.allowLate ? 'Accepted after the set closes' : 'Not accepted once it closes'}</dd>
        </dl>
        <span className="ms-set-composer__note" aria-hidden>
          students see it the moment you publish
        </span>
        {!teacherVerified ? (
          <p className="ms-set-composer__allowance mt-3 mb-0">{UNVERIFIED_SEAT_STUDENT_NOTE}</p>
        ) : null}
      </section>

      {error && (errorStep === null || error.field === 'body') ? <FormErrorAlert message={error.message} /> : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <div className="ms-set-composer__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void submit(false)}
          loading={submitting === 'draft'}
          loadingText="Saving…"
          disabled={submitting !== null}
        >
          Save draft
        </Button>
        <Button
          type="submit"
          size="lg"
          loading={submitting === 'publish'}
          loadingText="Publishing…"
          disabled={submitting !== null}
        >
          Publish
        </Button>
      </div>
    </form>
  )
}
