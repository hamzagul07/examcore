'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2 } from 'lucide-react'

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
}

export function InterventionGenerator({
  classroomId,
  targetCodes,
  onClose,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ title: string; count: number } | null>(
    null
  )

  useEffect(() => {
    fetch(`/api/teacher/classroom/${classroomId}/blindspots`)
      .then((r) => r.json())
      .then((d) => {
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
      .catch(() => setLoading(false))
  }, [classroomId])

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
    setGenerating(false)
    if (data.intervention) {
      setResult({
        title: data.intervention.title,
        count: data.questions?.length ?? selected.size,
      })
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center ec-modal-backdrop p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="ec-card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="ec-label-tech mb-2">INTERVENTION GENERATOR</div>
              <h3 className="text-2xl font-bold text-[var(--ec-text-primary)]">
                Target failing topics
              </h3>
              <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
                Codes: {targetCodes.join(', ')} — select 3–8 questions
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {result ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ec-glow-orb-lg">
                <Check className="h-8 w-8 ec-score-high" />
              </div>
              <h4 className="text-xl font-bold text-[var(--ec-text-primary)]">{result.title}</h4>
              <p className="mt-2 text-[var(--ec-text-secondary)]">
                Created with {result.count} questions. Share with your class via
                your LMS or print for in-class use.
              </p>
              <button type="button" onClick={onClose} className="ec-btn-primary mt-6">
                Done
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--ec-text-secondary)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading questions...
            </div>
          ) : (
            <>
              <div className="mb-6 max-h-80 space-y-2 overflow-y-auto">
                {questions.length === 0 && (
                  <p className="text-[var(--ec-text-secondary)]">
                    No past paper questions found for these topics in the
                    database.
                  </p>
                )}
                {questions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggle(q.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selected.has(q.id)
                        ? 'border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)] bg-[color-mix(in_srgb,var(--ec-brand)_5%,transparent)]'
                        : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] ec-hover-brand-border-mild hover:bg-[var(--ec-brand-muted)]'
                    }`}
                  >
                    <div className="mb-1 text-xs text-[var(--ec-text-secondary)]">
                      {q.paper_code} · {q.paper_session} · Q{q.question_number}{' '}
                      · {q.total_marks} marks
                    </div>
                    <p className="line-clamp-2 text-sm text-[var(--ec-text-primary)]">
                      {q.question_text}
                    </p>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={generate}
                disabled={selected.size < 3 || generating}
                className="ec-btn-primary w-full"
              >
                {generating
                  ? 'Generating...'
                  : `Generate test (${selected.size} questions)`}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
