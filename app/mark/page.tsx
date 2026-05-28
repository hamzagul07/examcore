'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from '@/components/ui/label'
import {
  MarkingResultView,
  type MarkingResultData,
} from '@/components/MarkingResultView'
import { SolutionSection } from '@/components/SolutionSection'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'
import { useSetAIContext } from '@/lib/omni-ai/context'
import { SidebarChat } from '@/components/omni-ai/SidebarChat'

type SessionInfo = {
  year: number
  season: string
  components: string[]
}

type SubjectInfo = {
  subject: string
  sessions: Record<string, SessionInfo>
}

type AvailablePapers = Record<string, SubjectInfo>

type MarkingResult = MarkingResultData & {
  attempt_id?: string | null
  answer_photo_url?: string | null
  line_references?: LineReference[] | null
}

export default function MarkPage() {
  const [answerPhoto, setAnswerPhoto] = useState<File | null>(null)
  const [questionPhoto, setQuestionPhoto] = useState<File | null>(null)
  const [questionTextInput, setQuestionTextInput] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MarkingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [availablePapers, setAvailablePapers] = useState<AvailablePapers | null>(
    null
  )
  const [papersLoading, setPapersLoading] = useState(true)
  const [showManualPaper, setShowManualPaper] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedComponent, setSelectedComponent] = useState('')
  const [questionNumber, setQuestionNumber] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/papers/available')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAvailablePapers(d.available || {})
      })
      .catch((err) => {
        console.error('Failed to load papers:', err)
        if (!cancelled) setAvailablePapers({})
      })
      .finally(() => {
        if (!cancelled) setPapersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Restore last manual selection from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem('examcore_last_selection')
      if (!saved) return
      const data = JSON.parse(saved)
      let hasAny = false
      if (typeof data.subject === 'string' && data.subject) {
        setSelectedSubject(data.subject)
        hasAny = true
      }
      if (typeof data.year === 'number') {
        setSelectedYear(data.year)
        hasAny = true
      }
      if (typeof data.session === 'string' && data.session) {
        setSelectedSession(data.session)
        hasAny = true
      }
      if (typeof data.component === 'string' && data.component) {
        setSelectedComponent(data.component)
        hasAny = true
      }
      if (hasAny) setShowManualPaper(true)
    } catch {
      // ignore corrupted localStorage entry
    }
  }, [])

  // One-shot pickup of a pending question number written by the attempt
  // detail page's "Mark again" button. Cleared on read so it only applies once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const pending = window.localStorage.getItem('examcore_pending_question')
      if (pending) {
        setQuestionNumber(pending)
        setShowManualPaper(true)
        window.localStorage.removeItem('examcore_pending_question')
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist manual selection (without question number) whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      selectedSubject ||
      selectedYear !== '' ||
      selectedSession ||
      selectedComponent
    ) {
      try {
        window.localStorage.setItem(
          'examcore_last_selection',
          JSON.stringify({
            subject: selectedSubject,
            year: selectedYear === '' ? '' : selectedYear,
            session: selectedSession,
            component: selectedComponent,
          })
        )
      } catch {
        // localStorage may be unavailable (private mode, quota); silently skip
      }
    }
  }, [selectedSubject, selectedYear, selectedSession, selectedComponent])

  const availableYears = useMemo<number[]>(() => {
    if (!selectedSubject || !availablePapers?.[selectedSubject]) return []
    const years = new Set<number>()
    for (const s of Object.values(availablePapers[selectedSubject].sessions)) {
      years.add(s.year)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [selectedSubject, availablePapers])

  const availableSeasons = useMemo<string[]>(() => {
    if (!selectedSubject || selectedYear === '' || !availablePapers?.[selectedSubject])
      return []
    const seasons = new Set<string>()
    for (const s of Object.values(availablePapers[selectedSubject].sessions)) {
      if (s.year === selectedYear) seasons.add(s.season)
    }
    return Array.from(seasons)
  }, [selectedSubject, selectedYear, availablePapers])

  const matchedSessionCode = useMemo<string>(() => {
    if (
      !selectedSubject ||
      selectedYear === '' ||
      !selectedSession ||
      !availablePapers?.[selectedSubject]
    )
      return ''
    const sessions = availablePapers[selectedSubject].sessions
    for (const [code, s] of Object.entries(sessions)) {
      if (s.year === selectedYear && s.season === selectedSession) return code
    }
    return ''
  }, [selectedSubject, selectedYear, selectedSession, availablePapers])

  const availableComponents = useMemo<string[]>(() => {
    if (!matchedSessionCode || !selectedSubject || !availablePapers) return []
    return (
      availablePapers[selectedSubject]?.sessions[matchedSessionCode]?.components ||
      []
    )
  }, [matchedSessionCode, selectedSubject, availablePapers])

  const isManualFilled = !!(
    selectedSubject &&
    selectedYear !== '' &&
    selectedSession &&
    selectedComponent &&
    questionNumber.trim()
  )

  const markingMode =
    showManualPaper || isManualFilled ? 'past_paper' : 'general'

  useSetAIContext({ type: 'marking', data: { mode: markingMode } }, [
    markingMode,
  ])

  function handleSubjectChange(value: string) {
    setSelectedSubject(value)
    setSelectedYear('')
    setSelectedSession('')
    setSelectedComponent('')
  }

  function handleYearChange(value: string) {
    setSelectedYear(value === '' ? '' : Number(value))
    setSelectedSession('')
    setSelectedComponent('')
  }

  function handleSessionChange(value: string) {
    setSelectedSession(value)
    setSelectedComponent('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!answerPhoto) {
      setErrorMsg('Upload a photo of your answer.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('photo', answerPhoto)
      if (questionPhoto) formData.append('question_photo', questionPhoto)
      if (questionTextInput.trim()) formData.append('question_text', questionTextInput)

      if (isManualFilled) {
        formData.append(
          'manual_paper_code',
          `${selectedSubject}/${selectedComponent}`
        )
        formData.append(
          'manual_paper_session',
          `${selectedSession} ${selectedYear}`
        )
        formData.append('manual_question_number', questionNumber.trim())
      }

      const res = await fetch('/api/mark/process', { method: 'POST', body: formData })
      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setErrorMsg(data.error || 'Marking failed.')
        return
      }

      setResult(data)
    } catch (err) {
      setLoading(false)
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  function resetForm() {
    setResult(null)
    setAnswerPhoto(null)
    setQuestionPhoto(null)
    setQuestionTextInput('')
    setShowOptional(false)
    // Keep subject/year/session/component so the next question on the same paper
    // doesn't require re-selecting. Only clear the per-question number.
    setQuestionNumber('')
    setErrorMsg('')
  }

  // After a result is shown: clear the photo + result, keep the question
  // context (manual selection + the optional question text) so the student
  // can immediately mark another attempt at the same question.
  function handleMarkAnotherAttempt() {
    setResult(null)
    setAnswerPhoto(null)
    setErrorMsg('')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Full reset — back to a blank form for a different question.
  function handleMarkNewQuestion() {
    resetForm()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ec-label-tech mb-4">MARK ANSWER</p>
          <h1 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[56px] md:text-[72px]">
            <span className="gradient-text">Get marked</span>
            <br />
            <span className="ec-text-gradient brand-breathe">in 30 seconds.</span>
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Cambridge A-Level mathematics, examiner-grade.
          </p>
        </motion.div>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* ====== STEP 1 ====== */}
            <section className="animate-entry stagger-1">
              <StepLabel number={1} label="Upload your answer" />
              <div className="relative mt-4 group">
                {/* Outer multi-color glow */}
                <div
                  className={`pointer-events-none absolute -inset-0.5 rounded-[28px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500 blur transition-opacity duration-300 ${
                    answerPhoto
                      ? 'opacity-60'
                      : 'opacity-25 group-hover:opacity-50'
                  }`}
                />
                <label
                  htmlFor="answer-photo"
                  className={`relative ec-card group block w-full cursor-pointer overflow-hidden p-10 text-center transition-all duration-300 hover:-translate-y-1 sm:p-12 ${
                    answerPhoto
                      ? 'border-emerald-500/60'
                      : 'border-2 border-dashed border-white/15 group-hover:border-emerald-500/50'
                  }`}
                  style={
                    answerPhoto
                      ? {
                          borderStyle: 'solid',
                          borderWidth: '2px',
                          boxShadow:
                            '0 1px 0 rgba(255,255,255,0.08) inset, 0 0 48px rgba(16,185,129,0.3), 0 24px 64px -16px rgba(16,185,129,0.35)',
                        }
                      : { borderStyle: 'dashed', borderWidth: '2px' }
                  }
                >
                  <div className="relative mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_32px_rgba(16,185,129,0.4)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" style={{ width: 72, height: 72 }}>
                    <UploadCloud className="h-9 w-9 text-emerald-400" />
                  </div>
                  <div className="relative text-lg font-bold text-white">
                    {answerPhoto ? answerPhoto.name : 'Click or drop a photo here'}
                  </div>
                  <div className="relative mt-2 font-mono text-xs text-slate-500">
                    {answerPhoto
                      ? `${(answerPhoto.size / 1024).toFixed(1)} KB`
                      : 'JPEG, PNG, or WebP · up to ~10 MB'}
                  </div>
                  <input
                    id="answer-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setAnswerPhoto(e.target.files?.[0] || null)}
                    required
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            {/* ====== STEP 2 ====== */}
            <section className="animate-entry stagger-2 space-y-4">
              <StepLabel
                number={2}
                label="Tell us about the question"
                hint="Optional"
              />

              {/* Manual paper selection */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualPaper(!showManualPaper)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showManualPaper ? 'rotate-90' : ''
                    }`}
                  />
                  {showManualPaper
                    ? 'Hide paper selection'
                    : 'Select paper manually if needed'}
                </button>

                {showManualPaper && (
                  <div className="ec-card mt-4 space-y-4 p-5 sm:p-6">
                    <p className="text-xs leading-relaxed text-slate-400">
                      Use this if your photo doesn&apos;t show the paper header or AI
                      can&apos;t auto-detect. We&apos;ll remember your selections for
                      next time.
                    </p>

                    {papersLoading && (
                      <p className="text-sm text-slate-500">
                        Loading available papers...
                      </p>
                    )}

                    {!papersLoading &&
                      availablePapers &&
                      Object.keys(availablePapers).length === 0 && (
                        <p className="text-sm text-slate-500">
                          No past papers available yet.
                        </p>
                      )}

                    {!papersLoading &&
                      availablePapers &&
                      Object.keys(availablePapers).length > 0 && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="manual-subject" className="label-overline mb-2 inline-block">
                              Subject
                            </Label>
                            <select
                              id="manual-subject"
                              value={selectedSubject}
                              onChange={(e) => handleSubjectChange(e.target.value)}
                              className="ec-input select-chevron appearance-none"
                            >
                              <option value="">Select...</option>
                              {Object.entries(availablePapers)
                                .sort(([, a], [, b]) =>
                                  a.subject.localeCompare(b.subject)
                                )
                                .map(([code, info]) => (
                                  <option key={code} value={code}>
                                    {info.subject} ({code})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="manual-year" className="label-overline mb-2 inline-block">
                              Year
                            </Label>
                            <select
                              id="manual-year"
                              value={selectedYear === '' ? '' : String(selectedYear)}
                              onChange={(e) => handleYearChange(e.target.value)}
                              disabled={!selectedSubject}
                              className="ec-input select-chevron appearance-none"
                            >
                              <option value="">Select...</option>
                              {availableYears.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="manual-session" className="label-overline mb-2 inline-block">
                              Session
                            </Label>
                            <select
                              id="manual-session"
                              value={selectedSession}
                              onChange={(e) => handleSessionChange(e.target.value)}
                              disabled={selectedYear === ''}
                              className="ec-input select-chevron appearance-none"
                            >
                              <option value="">Select...</option>
                              {availableSeasons.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="manual-component" className="label-overline mb-2 inline-block">
                              Paper
                            </Label>
                            <select
                              id="manual-component"
                              value={selectedComponent}
                              onChange={(e) => setSelectedComponent(e.target.value)}
                              disabled={!selectedSession}
                              className="ec-input select-chevron appearance-none"
                            >
                              <option value="">Select...</option>
                              {availableComponents.map((c) => (
                                <option key={c} value={c}>
                                  Paper {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor="manual-question" className="label-overline mb-2 inline-block">
                              Question number
                            </Label>
                            <input
                              id="manual-question"
                              type="text"
                              value={questionNumber}
                              onChange={(e) => setQuestionNumber(e.target.value)}
                              disabled={!selectedComponent}
                              placeholder="e.g., 1, 2(a), 3(b)(i)"
                              className="ec-input"
                            />
                          </div>
                        </div>
                      )}

                    {isManualFilled && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-300 backdrop-blur shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                        Selected:{' '}
                        <strong className="text-emerald-200">
                          {selectedSubject}/{selectedComponent}
                        </strong>{' '}
                        — {selectedSession} {selectedYear}, Question{' '}
                        <strong className="text-emerald-200">{questionNumber.trim()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Question text/photo */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showOptional ? 'rotate-90' : ''
                    }`}
                  />
                  {showOptional
                    ? 'Hide question details'
                    : 'Add the question (improves accuracy)'}
                </button>

                {showOptional && (
                  <div className="ec-card mt-4 space-y-4 p-5 sm:p-6">
                    <p className="text-xs leading-relaxed text-slate-400">
                      If your handwritten work doesn&apos;t show the question or paper
                      header, add it here so we can mark more accurately.
                    </p>

                    <div>
                      <Label htmlFor="question-photo" className="label-overline mb-2 inline-block">
                        Photo of the question
                      </Label>
                      <label
                        htmlFor="question-photo"
                        className="group block w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/10 bg-dark-900/40 p-5 text-center text-sm transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                      >
                        <UploadCloud className="mx-auto mb-2 h-5 w-5 text-slate-500 transition-colors group-hover:text-emerald-400" />
                        <div className="font-medium text-slate-300">
                          {questionPhoto ? questionPhoto.name : 'Click to upload'}
                        </div>
                        <input
                          id="question-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            setQuestionPhoto(e.target.files?.[0] || null)
                          }
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs font-medium text-slate-600">
                      <div className="h-px flex-1 bg-white/10" />
                      <span>OR</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div>
                      <Label htmlFor="question-text" className="label-overline mb-2 inline-block">
                        Type the question
                      </Label>
                      <textarea
                        id="question-text"
                        value={questionTextInput}
                        onChange={(e) => setQuestionTextInput(e.target.value)}
                        rows={3}
                        placeholder="e.g., Find dy/dx if y = 3x^2 + 5x - 2"
                        className="ec-input ec-question-text"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {errorMsg && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300 backdrop-blur">
                {errorMsg}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading || !answerPhoto}
              whileHover={loading || !answerPhoto ? undefined : { y: -2, scale: 1.01 }}
              whileTap={loading || !answerPhoto ? undefined : { y: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className={`ec-btn-primary w-full justify-center text-base ${
                answerPhoto && !loading ? 'brand-pulse' : ''
              }`}
              style={{ padding: '18px 32px' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Marking your answer...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Mark my answer
                </>
              )}
            </motion.button>
          </form>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mt-10 space-y-5"
            >
              <div className="ec-card overflow-hidden p-6">
                <Skeleton className="mx-auto h-3 w-24" />
                <Skeleton className="mx-auto mt-4 h-20 w-48" />
                <Skeleton className="mx-auto mt-4 h-3 w-40" />
                <Skeleton className="mx-auto mt-6 h-2.5 w-72" />
              </div>
              <div className="ec-card space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {result && (
          <div className="space-y-8">
            <MarkingResultView result={result} />

            {result.answer_photo_url &&
              Array.isArray(result.line_references) &&
              result.line_references.length > 0 && (
                <ExaminerInkSection
                  imageUrl={result.answer_photo_url}
                  lineReferences={result.line_references}
                />
              )}

            {result.attempt_id && (
              <SolutionSection attemptId={result.attempt_id} />
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleMarkAnotherAttempt}
                className="ec-btn-secondary w-full justify-center text-base"
                style={{ padding: '16px 24px' }}
              >
                Mark another attempt at this question
              </button>
              <button
                type="button"
                onClick={handleMarkNewQuestion}
                className="ec-btn-primary w-full justify-center text-base"
                style={{ padding: '16px 24px' }}
              >
                Mark a new question
              </button>
            </div>
          </div>
        )}
      </div>
      <SidebarChat />
    </main>
  )
}

/**
 * Wraps the overlay behind a reveal button. Two reasons:
 *  1. The overlay reads best AFTER the student has read the mark-by-mark
 *     breakdown — without context, the red ink can feel like an attack.
 *  2. Loading the image (and the framer-motion timer chain) lazily means we
 *     don't block the initial render with a network round-trip for the photo.
 */
function ExaminerInkSection({
  imageUrl,
  lineReferences,
}: {
  imageUrl: string
  lineReferences: LineReference[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="ec-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-red-500/15 blur-[80px]" />
      <div className="relative">
        <p className="ec-label-tech mb-3">EXAMINER&rsquo;S MARKS</p>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          See exactly where you earned and lost marks
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The AI examiner&rsquo;s annotations, drawn directly on your handwritten
          answer. Stamps go in the margin; red underlines flag where marks
          were lost.
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ec-btn-primary mt-6 self-start text-base"
            style={{ padding: '14px 24px' }}
          >
            <Sparkles className="h-5 w-5" />
            View examiner&rsquo;s marks
          </button>
        ) : (
          <div className="mt-6">
            <ExaminerInkOverlay
              imageUrl={imageUrl}
              lineReferences={lineReferences}
              animate
            />
          </div>
        )}
      </div>
    </section>
  )
}

function StepLabel({
  number,
  label,
  hint,
}: {
  number: number
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.4)]">
        {number}
      </span>
      <span className="text-base font-bold tracking-tight text-white">
        {label}
      </span>
      {hint && (
        <span className="font-mono text-xs font-medium text-slate-500">· {hint}</span>
      )}
    </div>
  )
}
