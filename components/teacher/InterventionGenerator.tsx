'use client'

import { useEffect, useId, useState } from 'react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import { Sheet } from '@/components/ui/Sheet'

interface Question {
  id: string
  question_text: string | null
  total_marks: number | null
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
}

interface Props {
  classroomId: string
  targetCodes: string[]
  onClose: () => void
  /**
   * Parents keep this mounted and flip `open`, so the sheet can slide out as
   * well as in. Defaults to open for a caller that mounts it on demand.
   */
  open?: boolean
}

/**
 * The intervention picker, on the shared Sheet (bottom sheet on a phone,
 * centred paper on a desk) rather than its own hand-rolled modal — so it gets
 * the focus trap, scroll lock, Escape and the one exit animation for free.
 *
 * Questions are fetched each time the sheet opens, which is what the previous
 * mount-on-open behaviour did.
 */
export function InterventionGenerator({
  classroomId,
  targetCodes,
  onClose,
  open = true,
}: Props) {
  const titleId = useId()
  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ title: string; count: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)
    setResult(null)
    fetch(`/api/teacher/classroom/${classroomId}/blindspots`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        const all: Question[] = []
        for (const topic of d.topicsWithQuestions || []) {
          for (const q of topic.sampleQuestions || []) {
            if (!all.find((x) => x.id === q.id)) all.push(q)
          }
        }
        setQuestions(all)
        setSelected(new Set(all.slice(0, 4).map((q) => q.id)))
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        console.error('InterventionGenerator: failed to load questions', err)
        setError('Could not load questions. Please try again.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [classroomId, open])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 8) next.add(id)
      return next
    })
  }

  async function generate() {
    if (selected.size < 3) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/teacher/classroom/${classroomId}/intervention`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_syllabus_codes: targetCodes,
            question_ids: [...selected],
            title: `Intervention: ${targetCodes.join(', ')}`,
          }),
        }
      )
      const data = await res.json()
      if (data.intervention) {
        setResult({
          title: data.intervention.title,
          count: data.questions?.length ?? selected.size,
        })
      } else {
        setError(data?.error || 'Could not generate the test. Please try again.')
      }
    } catch (err) {
      console.error('InterventionGenerator: failed to generate test', err)
      setError('Could not generate the test. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledById={titleId}
      className="ms-teacher-intervention sm:max-w-2xl"
    >
      <div className="mb-6 pr-10">
        <div className="ec-label-tech mb-2">INTERVENTION GENERATOR</div>
        <h3 id={titleId} className="text-title">
          Target failing topics
        </h3>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Codes: {targetCodes.join(', ')} — select 3–8 questions
        </p>
      </div>

      {result ? (
        <div className="ec-land text-center">
          <div
            className="ec-ink-stamp ec-ink-stamp--hero mx-auto mb-4"
            aria-hidden
          >
            ✓
          </div>
          <h4 className="text-title">{result.title}</h4>
          <p className="mt-2 tabular-nums text-[var(--ec-text-secondary)]">
            Created with {result.count} questions. Share with your class via
            your LMS or print for in-class use.
          </p>
          <button type="button" onClick={onClose} className="ec-btn-primary mt-6">
            Done
          </button>
        </div>
      ) : loading ? (
        <div className="mb-6 space-y-2" aria-busy aria-label="Loading questions">
          <p className="sr-only">Loading questions...</p>
          <SkeletonBlock className="h-[76px] w-full" />
          <SkeletonBlock className="h-[76px] w-full" />
          <SkeletonBlock className="h-[76px] w-full" />
          <SkeletonBlock className="h-[76px] w-full" />
        </div>
      ) : (
        <>
          {error && (
            <p className="mb-4 text-sm text-[var(--ec-danger)]" role="alert">
              {error}
            </p>
          )}
          <div className="mb-6 max-h-80 space-y-2 overflow-y-auto">
            {questions.length === 0 && !error && (
              <div className="ms-teacher-empty ec-land">
                <span className="ms-teacher-empty__icon" aria-hidden>
                  <span className="font-mono text-sm font-bold tracking-wide">Q</span>
                </span>
                <p className="ms-teacher-empty__body">
                  No past paper questions found for these topics in the
                  database.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="ec-btn-secondary mt-1 inline-flex min-h-[44px] items-center"
                >
                  Done
                </button>
              </div>
            )}
            {questions.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => toggle(q.id)}
                aria-pressed={selected.has(q.id)}
                className="ec-card ec-card--paper ms-teacher-pick min-h-[56px] w-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4"
              >
                <div className="mb-1 text-xs tabular-nums text-[var(--ec-text-secondary)]">
                  {q.paper_code} · {q.paper_session} · Q{q.question_number}{' '}
                  · {q.total_marks} marks
                </div>
                <div className="line-clamp-2 text-sm text-[var(--ec-text-primary)]">
                  {q.question_text ? (
                    <RichTextRenderer
                      text={q.question_text}
                      contentKind="question"
                      variant="light"
                    />
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={selected.size < 3 || generating}
            aria-busy={generating || undefined}
            data-loading={generating ? 'true' : undefined}
            className="ec-btn-primary min-h-[48px] w-full tabular-nums"
          >
            {generating
              ? 'Generating...'
              : `Generate test (${selected.size} questions)`}
          </button>
        </>
      )}
    </Sheet>
  )
}
