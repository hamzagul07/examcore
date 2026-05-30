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
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import {
  PageUploader,
  type UploadPage,
} from '@/components/upload/PageUploader'
import { useSetAIContext } from '@/lib/omni-ai/context'
import { SidebarChat } from '@/components/omni-ai/SidebarChat'
import { createClient } from '@/lib/supabase'
import {
  getSubjectByCode,
  getSubjectById,
} from '@/lib/profile-options'
import { WholePaperFlow } from '@/components/whole-paper/WholePaperFlow'
import { SingleQuestionMarkingProgress } from '@/components/mark/SingleQuestionMarkingProgress'
import type { WholePaperResult } from '@/lib/marking/types'
import type { MarkProgressStage } from '@/lib/marking/mark-progress'
import { getSubjectPaperStructure } from '@/lib/subject-papers'

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
  page_photo_urls?: string[]
  line_references?: LineReference[] | null
  ink_pages?: Array<{ photo_url: string; line_references: LineReference[] }>
  upload_mode?: 'single_question' | 'whole_paper'
  whole_paper?: WholePaperResult
}

export default function MarkPage() {
  const [answerPages, setAnswerPages] = useState<UploadPage[]>([])
  const [questionPhoto, setQuestionPhoto] = useState<File | null>(null)
  const [questionTextInput, setQuestionTextInput] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markProgress, setMarkProgress] = useState<{
    percent: number
    stage: MarkProgressStage
    questionNumber?: string
  } | null>(null)
  const [result, setResult] = useState<MarkingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorRetryable, setErrorRetryable] = useState(false)

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
  const [uploadMode, setUploadMode] = useState<'single_question' | 'whole_paper'>(
    'single_question'
  )
  const [paperQuestionOptions, setPaperQuestionOptions] = useState<string[]>([])
  const [wholePaperKey, setWholePaperKey] = useState(0)
  const [profileSubjectCodes, setProfileSubjectCodes] = useState<string[]>([])
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subjects')
          .eq('id', user.id)
          .maybeSingle()
        const subjectNames: string[] = profile?.subjects?.length
          ? profile.subjects
          : ['Mathematics']
        const codes = subjectNames
          .map((name) => getSubjectById(name)?.code)
          .filter((c): c is string => !!c)
        if (!cancelled) setProfileSubjectCodes(codes.length ? codes : ['9709'])
      } catch {
        if (!cancelled) setProfileSubjectCodes(['9709'])
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

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

  const profileSelectableSubjects = useMemo(() => {
    if (!availablePapers) return []
    const codes = profileSubjectCodes.length ? profileSubjectCodes : ['9709']
    return codes.filter((code) => availablePapers[code])
  }, [profileSubjectCodes, availablePapers])

  const activeSubjectMeta = useMemo(
    () => (selectedSubject ? getSubjectByCode(selectedSubject) : undefined),
    [selectedSubject]
  )

  const paperStructure = useMemo(
    () => (selectedSubject ? getSubjectPaperStructure(selectedSubject) : null),
    [selectedSubject]
  )

  const componentLabel = useMemo(() => {
    const labels = new Map<string, string>()
    if (paperStructure) {
      for (const group of paperStructure.papers) {
        for (const c of group.components) {
          labels.set(c, `${group.name} (${c})`)
        }
      }
    }
    return (component: string) =>
      labels.get(component) ?? `Component ${component}`
  }, [paperStructure])

  useEffect(() => {
    if (profileLoading || papersLoading || selectedSubject) return
    const preferred =
      profileSelectableSubjects.find((c) => c === '9709') ??
      profileSelectableSubjects[0]
    if (preferred) {
      setSelectedSubject(preferred)
      setShowManualPaper(true)
    }
  }, [
    profileLoading,
    papersLoading,
    selectedSubject,
    profileSelectableSubjects,
  ])

  const isManualFilled = !!(
    selectedSubject &&
    selectedYear !== '' &&
    selectedSession &&
    selectedComponent &&
    (uploadMode === 'whole_paper' || questionNumber.trim())
  )

  const wholePaperCode =
    selectedSubject && selectedComponent
      ? `${selectedSubject}/${selectedComponent}`
      : ''
  const wholePaperSession =
    selectedSession && selectedYear !== ''
      ? `${selectedSession} ${selectedYear}`
      : ''

  useEffect(() => {
    if (uploadMode !== 'whole_paper' || !wholePaperCode || !wholePaperSession) {
      setPaperQuestionOptions([])
      return
    }
    let cancelled = false
    fetch(
      `/api/mark/paper-questions?paper_code=${encodeURIComponent(wholePaperCode)}&paper_session=${encodeURIComponent(wholePaperSession)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.questions)) {
          setPaperQuestionOptions(d.questions)
        }
      })
      .catch(() => {
        if (!cancelled) setPaperQuestionOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [uploadMode, wholePaperCode, wholePaperSession])

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
    if (answerPages.length === 0) {
      setErrorMsg('Upload at least one page of your answer.')
      return
    }
    if (uploadMode === 'whole_paper') {
      setErrorMsg('Use the whole-paper upload area to submit your pages.')
      return
    }

    setLoading(true)
    setMarkProgress({ percent: 5, stage: 'reading_work' })
    setErrorMsg('')
    setErrorRetryable(false)
    setResult(null)

    try {
      const formData = new FormData()
      answerPages.forEach((p, i) => {
        formData.append(`pages[${i}]`, p.file)
      })
      if (answerPages.length === 1) {
        formData.append('photo', answerPages[0].file)
      }
      formData.append('upload_mode', uploadMode)
      formData.append('stream', '1')
      if (questionPhoto) formData.append('question_photo', questionPhoto)
      if (questionTextInput.trim()) formData.append('question_text', questionTextInput)

      if (selectedSubject && selectedYear !== '' && selectedSession && selectedComponent) {
        formData.append(
          'manual_paper_code',
          `${selectedSubject}/${selectedComponent}`
        )
        formData.append(
          'manual_paper_session',
          `${selectedSession} ${selectedYear}`
        )
        if (uploadMode === 'single_question' && questionNumber.trim()) {
          formData.append('manual_question_number', questionNumber.trim())
        }
      }

      const res = await fetch('/api/mark/process', { method: 'POST', body: formData })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setLoading(false)
        setMarkProgress(null)
        setErrorMsg(data.error || 'Marking failed.')
        setErrorRetryable(!!data.retryable)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalPayload: MarkingResult | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6)) as {
            type: string
            stage?: MarkProgressStage
            percent?: number
            payload?: MarkingResult
            error?: string
            retryable?: boolean
          }
          if (event.type === 'progress' && event.stage && event.percent != null) {
            setMarkProgress({
              percent: event.percent,
              stage: event.stage,
              questionNumber: questionNumber.trim() || undefined,
            })
          }
          if (event.type === 'result' && event.payload) {
            finalPayload = event.payload as MarkingResult
          }
          if (event.type === 'error') {
            setLoading(false)
            setMarkProgress(null)
            setErrorMsg(event.error || 'Marking failed.')
            setErrorRetryable(!!event.retryable)
            return
          }
        }
      }

      setLoading(false)
      setMarkProgress(null)
      if (finalPayload) {
        setResult(finalPayload)
      } else {
        setErrorMsg('Marking finished without a result. Please try again.')
      }
    } catch (err) {
      setLoading(false)
      setMarkProgress(null)
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  function resetForm() {
    setResult(null)
    setMarkProgress(null)
    setAnswerPages([])
    setQuestionPhoto(null)
    setQuestionTextInput('')
    setShowOptional(false)
    // Keep subject/year/session/component so the next question on the same paper
    // doesn't require re-selecting. Only clear the per-question number.
    setQuestionNumber('')
    setErrorMsg('')
    setErrorRetryable(false)
  }

  // After a result is shown: clear the photo + result, keep the question
  // context (manual selection + the optional question text) so the student
  // can immediately mark another attempt at the same question.
  function handleMarkAnotherAttempt() {
    setResult(null)
    setAnswerPages([])
    setErrorMsg('')
    setErrorRetryable(false)
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
            {activeSubjectMeta
              ? `Cambridge A-Level ${activeSubjectMeta.label}, examiner-grade.`
              : 'Cambridge A-Level past papers, examiner-grade.'}
          </p>
        </motion.div>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Upload mode */}
            <section className="animate-entry">
              <div className="ec-card flex flex-wrap gap-2 p-2">
                <button
                  type="button"
                  onClick={() => setUploadMode('single_question')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    uploadMode === 'single_question'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single question
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('whole_paper')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    uploadMode === 'whole_paper'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Whole paper
                </button>
              </div>
            </section>

            {/* Subject context */}
            <section className="animate-entry">
              <div className="ec-card space-y-4 p-5 sm:p-6">
                <div>
                  <Label htmlFor="mark-subject" className="label-overline mb-2 inline-block">
                    Subject
                  </Label>
                  <select
                    id="mark-subject"
                    value={selectedSubject}
                    onChange={(e) => {
                      handleSubjectChange(e.target.value)
                      setShowManualPaper(true)
                    }}
                    disabled={profileLoading || papersLoading}
                    className="ec-input select-chevron appearance-none"
                  >
                    <option value="">
                      {profileLoading ? 'Loading your subjects…' : 'Select subject…'}
                    </option>
                    {profileSelectableSubjects.map((code) => {
                      const meta = getSubjectByCode(code)
                      const label = availablePapers?.[code]?.subject ?? meta?.label ?? code
                      return (
                        <option key={code} value={code}>
                          {label} ({code})
                        </option>
                      )
                    })}
                  </select>
                </div>

                {selectedSubject && paperStructure && paperStructure.papers.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-dark-900/40 p-4">
                    <p className="label-overline mb-3">Available papers</p>
                    <ul className="space-y-1.5 text-sm text-slate-400">
                      {paperStructure.papers.map((p) => (
                        <li key={p.paper}>
                          <span className="font-medium text-slate-300">{p.name}</span>
                          <span className="font-mono text-xs text-slate-500">
                            {' '}
                            — {p.components.join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* ====== STEP 1 ====== */}
            {uploadMode === 'whole_paper' ? (
              <section className="animate-entry stagger-1 space-y-4">
                <StepLabel number={1} label="Upload your full answer paper" />
                {!isManualFilled ? (
                  <div className="ec-card p-5 text-sm text-slate-400">
                    Select subject, year, session, and paper below before uploading
                    your pages.
                  </div>
                ) : (
                  <WholePaperFlow
                    key={wholePaperKey}
                    paperCode={wholePaperCode}
                    paperSession={wholePaperSession}
                    questionOptions={paperQuestionOptions}
                    onError={(msg, retryable) => {
                      setErrorMsg(msg)
                      setErrorRetryable(!!retryable)
                    }}
                    onReset={() => {
                      setWholePaperKey((k) => k + 1)
                      setErrorMsg('')
                    }}
                  />
                )}
              </section>
            ) : (
            <section className="animate-entry stagger-1 space-y-4">
              <StepLabel number={1} label="Upload your answer" />
              <PageUploader
                pages={answerPages}
                onPagesChange={setAnswerPages}
                disabled={loading}
                emptyLabel="Click or drop your working here"
                emptyHint="One or more pages · JPEG, PNG, or WebP"
              />
            </section>
            )}

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
                              {profileSelectableSubjects.map((code) => {
                                const info = availablePapers[code]
                                if (!info) return null
                                return (
                                  <option key={code} value={code}>
                                    {info.subject} ({code})
                                  </option>
                                )
                              })}
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
                                  {componentLabel(c)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label htmlFor="manual-question" className="label-overline mb-2 inline-block">
                              Question number
                              {uploadMode === 'whole_paper' && (
                                <span className="ml-2 font-normal normal-case text-slate-500">
                                  (not needed for whole paper)
                                </span>
                              )}
                            </Label>
                            <input
                              id="manual-question"
                              type="text"
                              value={questionNumber}
                              onChange={(e) => setQuestionNumber(e.target.value)}
                              disabled={!selectedComponent || uploadMode === 'whole_paper'}
                              placeholder="e.g., 1, 2(a), 3(b)(i)"
                              className="ec-input"
                            />
                          </div>
                        </div>
                      )}

                    {isManualFilled && (
                      <div className="ec-highlight-success">
                        Selected:{' '}
                        <strong>
                          {selectedSubject}/{selectedComponent}
                        </strong>{' '}
                        — {selectedSession} {selectedYear}
                        {uploadMode === 'single_question' && (
                          <>
                            , Question <strong>{questionNumber.trim()}</strong>
                          </>
                        )}
                        {uploadMode === 'whole_paper' && (
                          <span> (whole paper)</span>
                        )}
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
              <div
                className={`rounded-2xl border p-3.5 text-sm backdrop-blur ${
                  errorRetryable
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                <p>{errorMsg}</p>
                {errorRetryable && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('')
                      setErrorRetryable(false)
                      void handleSubmit({
                        preventDefault: () => {},
                      } as React.FormEvent)
                    }}
                    disabled={loading || !answerPages.length}
                    className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            {uploadMode === 'single_question' && (
              <motion.button
                type="submit"
                disabled={loading || !answerPages.length}
                whileHover={loading || !answerPages.length ? undefined : { y: -2, scale: 1.01 }}
                whileTap={loading || !answerPages.length ? undefined : { y: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className={`ec-btn-primary w-full justify-center text-base ${
                  answerPages.length > 0 && !loading ? 'brand-pulse' : ''
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
            )}
          </form>
        )}

        <AnimatePresence>
          {loading && markProgress && (
            <motion.div
              key="marking-progress"
              className="mt-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SingleQuestionMarkingProgress
                percent={markProgress.percent}
                stage={markProgress.stage}
                questionNumber={markProgress.questionNumber}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {result && !result.whole_paper && (
          <div className="space-y-8">
            <MarkingResultView result={result} />

            {(result.ink_pages?.length ||
              (result.answer_photo_url &&
                result.line_references?.length)) && (
              <ExaminerInkSection result={result} />
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
function ExaminerInkSection({ result }: { result: MarkingResult }) {
  const [open, setOpen] = useState(false)
  const inkPages =
    result.ink_pages ??
    (result.answer_photo_url && result.line_references?.length
      ? [
          {
            photo_url: result.answer_photo_url,
            line_references: result.line_references,
          },
        ]
      : [])

  if (!inkPages.length) return null

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
            <ExaminerInkPerPage pages={inkPages} animate />
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
