'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MathText } from '@/components/MathText'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import type {
  Choice,
  ChoiceGroup,
  PickedPaper,
  PickedQuestion,
  TopicGroup,
} from '@/components/teacher/assignments/composer-model'
import { shortSession } from '@/components/teacher/assignments/matrix-cells'

type Row = PickedQuestion & { syllabus_tags: string[] | null }

type Query = { kind: 'paper'; paper_code: string; paper_session: string } | { kind: 'topic'; topic_code: string }

type Load = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; rows: Row[] }

function queryUrl(subjectCode: string, q: Query): string {
  const params = new URLSearchParams({ subject_code: subjectCode })
  if (q.kind === 'paper') {
    params.set('paper_code', q.paper_code)
    params.set('paper_session', q.paper_session)
  } else {
    params.set('topic_code', q.topic_code)
  }
  return `/api/teacher/question-picker?${params.toString()}`
}

/**
 * Questions from the bank for one query, fetched from
 * `/api/teacher/question-picker` (which never returns scheme text) and kept
 * per query, so flicking back to a paper does not refetch it. A newer query
 * aborts an older one in flight.
 */
function useBankQuestions(url: string | null): { load: Load; retry: () => void } {
  const cache = useRef(new Map<string, Row[]>())
  const [load, setLoad] = useState<Load>({ status: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!url) {
      setLoad({ status: 'idle' })
      return
    }
    const cached = cache.current.get(url)
    if (cached) {
      setLoad({ status: 'ok', rows: cached })
      return
    }
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          questions?: Array<Omit<Row, 'preview'> & { preview: string | null }>
          error?: string
        }
        if (!res.ok || !Array.isArray(data.questions)) {
          setLoad({ status: 'error', message: data.error || 'Could not load questions. Try again.' })
          return
        }
        const rows: Row[] = data.questions.map((q) => ({
          id: q.id,
          paper_code: q.paper_code,
          paper_session: q.paper_session,
          question_number: q.question_number,
          total_marks: typeof q.total_marks === 'number' ? q.total_marks : null,
          preview: q.preview ?? null,
          syllabus_tags: Array.isArray(q.syllabus_tags) ? q.syllabus_tags : null,
        }))
        cache.current.set(url, rows)
        setLoad({ status: 'ok', rows })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLoad({ status: 'error', message: 'Could not reach the server. Check your connection and try again.' })
      })
    return () => controller.abort()
  }, [url, attempt])

  return { load, retry: () => setAttempt((n) => n + 1) }
}

/** Paper + session selects, with free-text fields when the subject's paper list is unknown. */
function PaperFields({
  idPrefix,
  papers,
  paperCode,
  session,
  onPaper,
  onSession,
  subjectCode,
}: {
  idPrefix: string
  papers: { components: ChoiceGroup[]; sessions: Choice[] }
  paperCode: string
  session: string
  onPaper: (v: string) => void
  onSession: (v: string) => void
  subjectCode: string
}) {
  const known = papers.components.length > 0 && papers.sessions.length > 0
  return (
    <div className="ms-set-composer__row">
      <div className="ms-set-composer__field">
        <label htmlFor={`${idPrefix}-paper`} className="ms-set-composer__label">
          Paper
        </label>
        {known ? (
          <select
            id={`${idPrefix}-paper`}
            className="ec-input min-h-[44px] w-full"
            value={paperCode}
            onChange={(e) => onPaper(e.target.value)}
          >
            <option value="">Choose a paper…</option>
            {papers.components.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <input
            id={`${idPrefix}-paper`}
            className="ec-input min-h-[44px] w-full"
            value={paperCode}
            placeholder={`${subjectCode}/1`}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onPaper(e.target.value)}
          />
        )}
      </div>
      <div className="ms-set-composer__field">
        <label htmlFor={`${idPrefix}-session`} className="ms-set-composer__label">
          Exam session
        </label>
        {known ? (
          <select
            id={`${idPrefix}-session`}
            className="ec-input min-h-[44px] w-full"
            value={session}
            onChange={(e) => onSession(e.target.value)}
          >
            <option value="">Choose a session…</option>
            {papers.sessions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`${idPrefix}-session`}
            className="ec-input min-h-[44px] w-full"
            value={session}
            placeholder="May/June 2024"
            autoComplete="off"
            onChange={(e) => onSession(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}

function LoadState({ load, retry, empty }: { load: Load; retry: () => void; empty: string }) {
  if (load.status === 'loading') {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
        <span className="sr-only">Loading questions…</span>
        <SkeletonBlock className="h-14 w-full" />
        <SkeletonBlock className="h-14 w-full" />
        <SkeletonBlock className="h-14 w-full" />
      </div>
    )
  }
  if (load.status === 'error') {
    return (
      <div className="ms-teacher-start__error" role="alert">
        <p className="m-0">{load.message}</p>
        <button type="button" onClick={retry} className="ec-btn-ghost mt-2 inline-flex min-h-[44px] items-center">
          Try again
        </button>
      </div>
    )
  }
  if (load.status === 'ok' && load.rows.length === 0) {
    return <p className="ms-set-composer__hint">{empty}</p>
  }
  return null
}

/**
 * Pick past-paper questions (docs/TEACHER_SYSTEM_SPEC.md §4 composer:
 * "QuestionPicker paper/session → /api/teacher/question-picker rows with
 * aria-pressed, MathText preview"). Browse one paper, or every banked
 * question tagged with a syllabus topic. Each row is a toggle button; the
 * set's 12-question cap disables new picks (never un-picks) when it is full.
 */
export function QuestionPicker({
  subjectCode,
  papers,
  topics,
  selected,
  onToggle,
  remaining,
}: {
  subjectCode: string
  papers: { components: ChoiceGroup[]; sessions: Choice[] }
  topics: readonly TopicGroup[]
  selected: readonly PickedQuestion[]
  onToggle: (q: PickedQuestion) => void
  /** Questions that can still be added before the set is full. */
  remaining: number
}) {
  const idPrefix = useId()
  const [mode, setMode] = useState<'paper' | 'topic'>('paper')
  const [paperCode, setPaperCode] = useState('')
  const [session, setSession] = useState('')
  const [topic, setTopic] = useState('')

  const query: Query | null =
    mode === 'paper'
      ? paperCode.trim() && session.trim()
        ? { kind: 'paper', paper_code: paperCode.trim(), paper_session: session.trim() }
        : null
      : topic
        ? { kind: 'topic', topic_code: topic }
        : null
  const { load, retry } = useBankQuestions(query ? queryUrl(subjectCode, query) : null)
  const picked = new Set(selected.map((q) => q.id))
  const listLabel =
    query?.kind === 'paper' ? `Questions on ${query.paper_code}, ${query.paper_session}` : `Questions tagged ${topic}`

  return (
    <div>
      {topics.length > 0 ? (
        <div className="mb-3">
          <SegmentedControl<'paper' | 'topic'>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'paper', label: 'By paper' },
              { value: 'topic', label: 'By topic' },
            ]}
            aria-label="Find questions"
            className="ms-teacher-start__choices"
            optionClassName="ms-teacher-start__choice"
          />
        </div>
      ) : null}

      {mode === 'paper' ? (
        <PaperFields
          idPrefix={idPrefix}
          papers={papers}
          paperCode={paperCode}
          session={session}
          onPaper={setPaperCode}
          onSession={setSession}
          subjectCode={subjectCode}
        />
      ) : (
        <div className="ms-set-composer__field">
          <label htmlFor={`${idPrefix}-topic`} className="ms-set-composer__label">
            Topic
          </label>
          <select
            id={`${idPrefix}-topic`}
            className="ec-input min-h-[44px] w-full"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">Choose a topic…</option>
            {topics.map((g) =>
              g.leaves.length === 0 ? (
                <option key={g.code} value={g.code}>
                  {g.code} {g.name}
                </option>
              ) : (
                <optgroup key={g.code} label={`${g.code} ${g.name}`}>
                  <option value={g.code}>{`${g.code} — the whole section`}</option>
                  {g.leaves.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} {l.name}
                    </option>
                  ))}
                </optgroup>
              )
            )}
          </select>
        </div>
      )}

      {remaining <= 0 ? (
        <p className="ms-set-composer__hint" role="status">
          The set is full — take a question out to add another.
        </p>
      ) : null}

      <LoadState
        load={load}
        retry={retry}
        empty={
          query?.kind === 'topic'
            ? 'No banked questions are tagged with this topic yet — try its section, or set a prompt instead.'
            : 'We don’t hold this paper’s questions yet — try another session.'
        }
      />

      {load.status === 'ok' && load.rows.length > 0 ? (
        <ul className="ms-set-composer__picker" aria-label={listLabel}>
          {load.rows.map((q) => {
            const on = picked.has(q.id)
            const full = !on && remaining <= 0
            const ref = query?.kind === 'topic' ? `${q.paper_code} · ${shortSession(q.paper_session)} · ` : ''
            return (
              <li key={q.id}>
                <button
                  type="button"
                  className="ms-set-composer__pick"
                  aria-pressed={on}
                  aria-disabled={full || undefined}
                  onClick={() => {
                    if (full) return
                    onToggle(q)
                  }}
                >
                  <span className="ms-set-composer__pick-code">
                    {ref}Q{q.question_number}
                  </span>
                  <span className="ms-set-composer__pick-preview">
                    {q.preview ? <MathText text={q.preview} /> : 'No preview — the question is on the paper.'}
                  </span>
                  <span className="ms-set-composer__pick-marks">
                    {q.total_marks !== null ? `[${q.total_marks}]` : ''}
                    <span className="sr-only">
                      {q.total_marks !== null ? ` ${q.total_marks} marks` : ''}
                      {on ? ', in the set' : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Pick a whole paper (kind `whole_paper`): the same paper and session
 * fields, checked against the bank before it can be added, so a paper the
 * resolver would refuse ("We don't hold a mark scheme") is caught here.
 */
export function WholePaperPicker({
  subjectCode,
  papers,
  picked,
  onAdd,
  full,
}: {
  subjectCode: string
  papers: { components: ChoiceGroup[]; sessions: Choice[] }
  picked: readonly PickedPaper[]
  onAdd: (p: PickedPaper) => void
  full: boolean
}) {
  const idPrefix = useId()
  const [paperCode, setPaperCode] = useState('')
  const [session, setSession] = useState('')
  const query: Query | null =
    paperCode.trim() && session.trim()
      ? { kind: 'paper', paper_code: paperCode.trim(), paper_session: session.trim() }
      : null
  const { load, retry } = useBankQuestions(query ? queryUrl(subjectCode, query) : null)
  const isPicked =
    query?.kind === 'paper' &&
    picked.some((p) => p.paper_code === query.paper_code && p.paper_session === query.paper_session)
  const rows = load.status === 'ok' ? load.rows : []
  const marks = rows.map((r) => r.total_marks)
  const total = rows.length > 0 && marks.every((m): m is number => m !== null) ? marks.reduce((a, b) => a + b, 0) : null

  return (
    <div>
      <PaperFields
        idPrefix={idPrefix}
        papers={papers}
        paperCode={paperCode}
        session={session}
        onPaper={setPaperCode}
        onSession={setSession}
        subjectCode={subjectCode}
      />
      <LoadState load={load} retry={retry} empty="We don’t hold this paper’s mark scheme yet — try another session." />
      {query?.kind === 'paper' && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="ms-set-composer__hint m-0">
            {rows.length} {rows.length === 1 ? 'question' : 'questions'}
            {total !== null ? ` · ${total} marks` : ''}
          </p>
          <button
            type="button"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center"
            disabled={isPicked || full}
            onClick={() => onAdd({ paper_code: query.paper_code, paper_session: query.paper_session })}
          >
            {isPicked ? 'Added' : 'Add this paper'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
