'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import {
  MarkingResultView,
  type MarkingResultData,
} from '@/components/MarkingResultView'
import { SolutionSection } from '@/components/SolutionSection'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { MarkStepsBar } from '@/components/mark/MarkStepsBar'
import {
  PageUploader,
  type UploadPage,
} from '@/components/upload/PageUploader'
import { QuestionUploadField } from '@/components/mark/QuestionUploadField'
import {
  hasCompressingPages,
  prepareSingleQuestionUpload,
} from '@/lib/upload/prepare-upload'
import { useSetAIContext } from '@/lib/omni-ai/context'
import {
  readClientStorage,
  removeClientStorage,
  STORAGE_KEYS,
  writeClientStorage,
} from '@/lib/client-storage'
import { createClient } from '@/lib/supabase'
import {
  getSubjectByCode,
  getSubjectById,
  SUBJECTS,
  defaultMarkSubjectCode,
  defaultSubjectsForProfile,
} from '@/lib/profile-options'
import { getIbMarkableSubjectCodes, resolveSubjectLabel, isIbSubjectCode } from '@/lib/ib/marking-config'
import { ibPracticeCriteriaSummary } from '@/lib/ib/practice-prompts'
import { WholePaperFlow } from '@/components/whole-paper/WholePaperFlow'
import { WholePaperResultView } from '@/components/WholePaperResultView'
import { PostMarkNextSteps } from '@/components/mark/PostMarkNextSteps'
import {
  MarkExampleBanner,
  MarkExampleFooter,
  MarkExampleInvite,
} from '@/components/mark/MarkExample'
import { MarkFeedbackPrompt } from '@/components/mark/MarkFeedbackPrompt'
import {
  DEMO_MARK_RESULT,
  DEMO_MARK_QUERY_PARAM,
} from '@/lib/marking/demo-result'
import { PastPaperSelectorFields } from '@/components/mark/PastPaperSelectorFields'
import {
  MarkBoardPicker,
  markBoardFromProfileBoard,
  subjectMatchesMarkBoard,
  type MarkExamBoard,
} from '@/components/mark/MarkBoardPicker'
import { MarkingModeHint } from '@/components/mark/MarkingModeHint'
import { formatClientMarkError } from '@/lib/marking/client-mark-errors'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import { parseMarkReturnPath } from '@/lib/marking/mark-return-url'
import { applyTopicQuestionToPaperSelection } from '@/lib/marking/topic-question'
import { CinematicMarkingExperience } from '@/components/mark/CinematicMarkingExperienceLazy'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { CelebrationModal } from '@/components/ui/CelebrationModal'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { BillingLimitBanner } from '@/components/billing/BillingLimitBanner'
import { GuestMarkNotice } from '@/components/billing/GuestMarkNotice'
import { MarkUsageIndicator } from '@/components/billing/MarkUsageIndicator'
import { capForTier } from '@/lib/billing/caps'
import { FREE_WHOLE_PAPER_QUESTION_LIMIT, hasPaidAccess } from '@/lib/billing/features'
import {
  questionUsageMessage,
  type BillingSummaryClient,
} from '@/lib/billing/question-copy'
import type { AllowanceBlock } from '@/lib/billing/client-types'
import type { SubscriptionTier } from '@/lib/database.types'
import type { WholePaperResult } from '@/lib/marking/types'
import type {
  MarkContextPayload,
  MarkProgressStage,
} from '@/lib/marking/mark-progress'
import {
  getComponentsForSession,
  getSeasonsForYearFromSessions,
  getSubjectPaperStructure,
  getYearsFromSessions,
} from '@/lib/subject-papers'
import { sessionCodeFromYearSeason } from '@/lib/marking/session'
import {
  handleMarkStreamEvent,
  parseMarkStreamPart,
  refreshBillingSummary,
  type FullMarksRewritePayload,
} from './mark-stream'

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
  /** Set when a scanned script was split into several separately-marked questions. */
  multi_question?: boolean
  _allowance?: AllowanceBlock
}

type UpgradeModalState = {
  variant: 'anonymous' | 'cap'
  tier?: SubscriptionTier
  cap?: number | null
  periodResetsAt?: string | null
  creditBalance?: number
}

export default function MarkPage() {
  const [answerPages, setAnswerPages] = useState<UploadPage[]>([])
  const [answerPdf, setAnswerPdf] = useState<File | null>(null)
  const [answerPdfError, setAnswerPdfError] = useState<string | null>(null)
  const [questionPhoto, setQuestionPhoto] = useState<File | null>(null)
  const [questionPhotoCompressing, setQuestionPhotoCompressing] = useState(false)
  const [questionTextInput, setQuestionTextInput] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markProgress, setMarkProgress] = useState<{
    percent: number
    stage: MarkProgressStage
    questionNumber?: string
  } | null>(null)
  const [markContext, setMarkContext] = useState<MarkContextPayload | null>(
    null
  )
  const [markStreamError, setMarkStreamError] = useState<string | null>(null)
  const [result, setResult] = useState<MarkingResult | null>(null)
  // Sprint 46: the final payload is buffered here the instant marking finishes,
  // but the real results page is not shown until the cinematic wait signals it
  // is ready to hand off (onReveal). The ref mirrors it for the reveal callback.
  const [pendingResult, setPendingResult] = useState<MarkingResult | null>(null)
  const pendingResultRef = useRef<MarkingResult | null>(null)
  // True while `result` holds the sample mark rather than one of the user's own.
  // Gates everything that only makes sense for a real attempt (next steps,
  // solutions, feedback) and drives the "this is an example" labelling.
  const [showingExample, setShowingExample] = useState(false)
  const submittingRef = useRef(false)
  // The stream now outlives the reveal — it stays open while the premium
  // rewrite generates — so a second mark can legitimately start while the first
  // is still draining. Every state write originating from a stream is tagged
  // with the run that produced it, and the previous request is aborted on
  // submit; otherwise mark #1's late error or late rewrite lands on mark #2.
  const markRunSeqRef = useRef(0)
  const markAbortRef = useRef<AbortController | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorRetryable, setErrorRetryable] = useState(false)
  const [firstMarkCelebration, setFirstMarkCelebration] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState | null>(null)
  const [showFreeNudge, setShowFreeNudge] = useState(false)
  const [billingSummary, setBillingSummary] = useState<BillingSummaryClient | null>(null)
  const [billingSummaryError, setBillingSummaryError] = useState(false)
  // Set when the user arrived via a "Drill this" link from the insights
  // dashboard. Drives the practice banner and the return-to-insights CTA.
  const [practiceContext, setPracticeContext] = useState<{
    pattern: string
    reason: string
    returnTo: string | null
  } | null>(null)
  const [courseTopicContext, setCourseTopicContext] = useState<{
    topicCode: string
    topicName: string
    returnTo: string | null
    foundQuestion: boolean
    paperLabel?: string
    ibPractice?: boolean
    criteriaSummary?: string | null
  } | null>(null)
  const [schemeInDb, setSchemeInDb] = useState<boolean | null>(null)

  const [availablePapers, setAvailablePapers] = useState<AvailablePapers | null>(
    null
  )
  const [papersLoading, setPapersLoading] = useState(true)
  const [papersError, setPapersError] = useState(false)
  const [papersReloadKey, setPapersReloadKey] = useState(0)
  const [showManualPaper, setShowManualPaper] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedComponent, setSelectedComponent] = useState('')
  const [questionNumber, setQuestionNumber] = useState('')
  const [uploadMode, setUploadMode] = useState<'single_question' | 'whole_paper'>(
    'single_question'
  )
  const [markIntent, setMarkIntent] = useState<
    'past_paper' | 'practice_question' | 'combined_script'
  >('past_paper')
  const [paperQuestionOptions, setPaperQuestionOptions] = useState<string[]>([])
  const [wholePaperKey, setWholePaperKey] = useState(0)
  const [profileSubjectCodes, setProfileSubjectCodes] = useState<string[]>([])
  const [, setProfileLevel] = useState('A-Level')
  const [selectedMarkBoard, setSelectedMarkBoard] = useState<MarkExamBoard>('cambridge')
  const [profileLoading, setProfileLoading] = useState(true)

  // IB assessment catalog (M1) — drives Level + Component selection for catalogued subjects.
  type IbCatalogComponent = {
    component_key: string
    label: string
    level: string
    assessment_model: string
    max_marks: number | null
  }
  type IbCatalogSubject = {
    code: string
    name: string
    level_scope: string
    components: IbCatalogComponent[]
  }
  const [ibCatalog, setIbCatalog] = useState<IbCatalogSubject[]>([])
  const [ibLevel, setIbLevel] = useState<'HL' | 'SL'>('SL')
  const [ibComponentKey, setIbComponentKey] = useState('')
  const [ibMarksAvailable, setIbMarksAvailable] = useState('')
  // General per-question total-marks control, shown on every single-question
  // upload where the denominator would otherwise be guessed by the model.
  const [totalMarksInput, setTotalMarksInput] = useState('')
  const [marksInQuestion, setMarksInQuestion] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ib/catalog')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setIbCatalog(Array.isArray(d?.subjects) ? d.subjects : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadBilling() {
      try {
        const res = await fetch('/api/billing/summary', { cache: 'no-store' })
        if (cancelled) return
        if (!res.ok) {
          setBillingSummaryError(true)
          return
        }
        setBillingSummary((await res.json()) as BillingSummaryClient)
        setBillingSummaryError(false)
      } catch {
        if (!cancelled) {
          setBillingSummary(null)
          setBillingSummaryError(true)
        }
      }
    }
    void loadBilling()
    const onRefresh = () => void loadBilling()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('ec:billing-refresh', onRefresh)
    }
  }, [])

  const submitBlocked =
    billingSummary?.signedIn && billingSummary.questions
      ? questionUsageMessage(billingSummary).disableSubmit
      : false

  const cinematicActive = loading && !!markProgress
  const markStage: 0 | 1 | 2 =
    result ? 2 : cinematicActive || loading ? 1 : 0

  useEffect(() => {
    if (!cinematicActive || typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [cinematicActive])

  // Uploaded photos only live in memory — warn before a refresh/close discards
  // them. Skipped once results are in (nothing left to lose).
  const hasUnsavedUploads =
    (answerPages.length > 0 || !!answerPdf) && !result
  useEffect(() => {
    if (!hasUnsavedUploads || typeof window === 'undefined') return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedUploads])

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
          .select('subjects, level, board')
          .eq('id', user.id)
          .maybeSingle()
        const profileLevel = profile?.level ?? 'A-Level'
        const profileBoard = profile?.board ?? 'Cambridge International'
        const subjectNames: string[] = profile?.subjects?.length
          ? profile.subjects
          : defaultSubjectsForProfile(profileBoard, profileLevel)
        const codes = subjectNames
          .map((name) => getSubjectById(name, profileLevel)?.code)
          .filter((c): c is string => !!c)
        const markBoard = markBoardFromProfileBoard(profileBoard)
        const fallbackCode = defaultMarkSubjectCode(profileLevel)
        if (!cancelled) {
          setProfileLevel(profileLevel)
          setProfileSubjectCodes(codes.length ? codes : [fallbackCode])
          setSelectedMarkBoard(markBoard)
          if (markBoard === 'ib') {
            setUploadMode('single_question')
            setMarkIntent('practice_question')
            setShowManualPaper(false)
          }
        }
      } catch {
        if (!cancelled) setProfileSubjectCodes([defaultMarkSubjectCode('A-Level')])
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
    setPapersLoading(true)
    setPapersError(false)
    fetch('/api/papers/available')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAvailablePapers(d.available || {})
      })
      .catch((err) => {
        console.error('Failed to load papers:', err)
        if (!cancelled) {
          setAvailablePapers({})
          setPapersError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setPapersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [papersReloadKey])

  // Restore last manual selection from localStorage after profile load.
  useEffect(() => {
    if (profileLoading || typeof window === 'undefined') return
    try {
      const saved = readClientStorage(STORAGE_KEYS.lastSelection)
      if (!saved) return
      const data = JSON.parse(saved)
      let hasAny = false
      if (typeof data.subject === 'string' && data.subject) {
        if (subjectMatchesMarkBoard(data.subject, selectedMarkBoard)) {
          setSelectedSubject(data.subject)
          hasAny = true
          if (typeof data.year === 'number') {
            setSelectedYear(data.year)
          }
          if (typeof data.session === 'string' && data.session) {
            setSelectedSession(data.session)
          }
          if (typeof data.component === 'string' && data.component) {
            setSelectedComponent(data.component)
          }
        }
      } else {
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
      }
      if (hasAny && selectedMarkBoard !== 'ib') {
        setShowManualPaper(true)
      }
    } catch {
      // ignore corrupted localStorage entry
    }
  }, [profileLoading, selectedMarkBoard])

  // One-shot pickup of a pending question number written by the attempt
  // detail page's "Mark again" button. Cleared on read so it only applies once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const pending = readClientStorage(STORAGE_KEYS.pendingQuestion)
      if (pending) {
        setQuestionNumber(pending)
        setShowManualPaper(true)
        removeClientStorage(STORAGE_KEYS.pendingQuestion)
      }
    } catch {
      // ignore
    }
  }, [])

  // "Drill this" deep-link from the insights dashboard. Preloads the exact
  // recommended question (which always exists in mark_schemes) and shows a
  // practice banner. Declared after the localStorage effects so it wins.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('practice') !== '1') return
    const paper = sp.get('paper') || ''
    const session = sp.get('session') || ''
    const q = sp.get('q') || ''
    const [subjectCode, componentCode] = paper.split('/')
    if (subjectCode) setSelectedSubject(subjectCode)
    if (componentCode) setSelectedComponent(componentCode)
    const sessionMatch = session.match(/^(.*)\s+(\d{4})$/)
    if (sessionMatch) {
      setSelectedSession(sessionMatch[1])
      setSelectedYear(Number(sessionMatch[2]))
    } else if (session) {
      setSelectedSession(session)
    }
    if (q) setQuestionNumber(q)
    setShowManualPaper(true)
    setShowOptional(true)
    setPracticeContext({
      pattern: sp.get('pattern') || 'this pattern',
      reason: sp.get('reason') || '',
      returnTo: sp.get('return'),
    })
  }, [])

  // Course lesson "Mark this topic" deep-link — /mark?subject=9609&topic=5.4.4
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('practice') === '1') return
    const subject = sp.get('subject')?.trim()
    const topic = sp.get('topic')?.trim()
    if (!subject || !topic) return

    setUploadMode('single_question')
    setMarkIntent('past_paper')
    setSelectedSubject(subject)
    setShowManualPaper(true)
    if (isIbSubjectCode(subject)) {
      setSelectedMarkBoard('ib')
      setMarkIntent('practice_question')
      setShowManualPaper(false)
    } else {
      setSelectedMarkBoard('cambridge')
    }

    const returnTo = parseMarkReturnPath(sp.get('return'))

    let cancelled = false
    fetch(
      `/api/mark/topic-question?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`
    )
      .then((r) => r.json())
      .then((data: {
        found?: boolean
        ib_practice?: boolean
        topic_name?: string
        paper_code?: string
        paper_session?: string
        question_number?: string
        practice_prompt?: string
        criteria_summary?: string | null
      }) => {
        if (cancelled) return

        if (data.ib_practice && isIbSubjectCode(subject)) {
          setUploadMode('single_question')
          setMarkIntent('practice_question')
          setShowManualPaper(false)
          if (data.practice_prompt) setQuestionTextInput(data.practice_prompt)
          setCourseTopicContext({
            topicCode: topic,
            topicName: data.topic_name ?? topic,
            returnTo,
            foundQuestion: false,
            ibPractice: true,
            criteriaSummary: data.criteria_summary ?? null,
          })
          return
        }

        if (data.found && data.paper_code && data.paper_session && data.question_number) {
          const selection = applyTopicQuestionToPaperSelection({
            paper_code: data.paper_code,
            paper_session: data.paper_session,
            question_number: data.question_number,
            question_text: null,
            total_marks: null,
            matched_topic: topic,
          })
          if (selection) {
            setSelectedSubject(selection.subject)
            setSelectedComponent(selection.component)
            setSelectedSession(selection.session)
            setSelectedYear(selection.year)
            setQuestionNumber(selection.questionNumber)
          }
        }
        setCourseTopicContext({
          topicCode: topic,
          topicName: data.topic_name ?? topic,
          returnTo,
          foundQuestion: !!data.found,
          paperLabel:
            data.found && data.paper_code && data.question_number
              ? `${data.paper_code} · Q${data.question_number}`
              : undefined,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setCourseTopicContext({
            topicCode: topic,
            topicName: topic,
            returnTo,
            foundQuestion: false,
          })
        }
      })

    return () => {
      cancelled = true
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
        writeClientStorage(
          STORAGE_KEYS.lastSelection,
          JSON.stringify({
            markBoard: selectedMarkBoard,
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
  }, [selectedSubject, selectedYear, selectedSession, selectedComponent, selectedMarkBoard])

  const paperStructure = useMemo(
    () => (selectedSubject ? getSubjectPaperStructure(selectedSubject) : null),
    [selectedSubject]
  )

  const availableYears = useMemo<number[]>(() => {
    if (!selectedSubject) return []
    const years = new Set<number>()
    if (availablePapers?.[selectedSubject]) {
      for (const s of Object.values(availablePapers[selectedSubject].sessions)) {
        years.add(s.year)
      }
    }
    if (paperStructure?.sessions?.length) {
      for (const year of getYearsFromSessions(paperStructure.sessions)) {
        years.add(year)
      }
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [selectedSubject, availablePapers, paperStructure])

  const availableSeasons = useMemo<string[]>(() => {
    if (!selectedSubject || selectedYear === '') return []
    const seasons = new Set<string>()
    if (availablePapers?.[selectedSubject]) {
      for (const s of Object.values(availablePapers[selectedSubject].sessions)) {
        if (s.year === selectedYear) seasons.add(s.season)
      }
    }
    if (paperStructure?.sessions?.length) {
      for (const season of getSeasonsForYearFromSessions(
        paperStructure.sessions,
        selectedYear
      )) {
        seasons.add(season)
      }
    }
    return Array.from(seasons)
  }, [selectedSubject, selectedYear, availablePapers, paperStructure])

  const matchedSessionCode = useMemo<string>(() => {
    if (
      !selectedSubject ||
      selectedYear === '' ||
      !selectedSession ||
      !availablePapers?.[selectedSubject]
    ) {
      if (
        selectedSubject &&
        selectedYear !== '' &&
        selectedSession &&
        paperStructure?.sessions?.length
      ) {
        return (
          sessionCodeFromYearSeason(selectedYear, selectedSession) ??
          ''
        )
      }
      return ''
    }
    const sessions = availablePapers[selectedSubject].sessions
    for (const [code, s] of Object.entries(sessions)) {
      if (s.year === selectedYear && s.season === selectedSession) return code
    }
    return (
      sessionCodeFromYearSeason(selectedYear, selectedSession) ??
      ''
    )
  }, [selectedSubject, selectedYear, selectedSession, availablePapers, paperStructure])

  const availableComponents = useMemo<string[]>(() => {
    if (!matchedSessionCode || !selectedSubject) return []
    const fromStorage =
      availablePapers?.[selectedSubject]?.sessions[matchedSessionCode]
        ?.components ?? []
    if (fromStorage.length > 0) return fromStorage
    if (
      paperStructure &&
      selectedYear !== '' &&
      selectedSession
    ) {
      return getComponentsForSession(
        paperStructure,
        selectedYear,
        selectedSession
      )
    }
    return []
  }, [
    matchedSessionCode,
    selectedSubject,
    availablePapers,
    paperStructure,
    selectedYear,
    selectedSession,
  ])

  const profileSelectableSubjects = useMemo(() => {
    // Signed-in users see their profile subjects; guests (no profile) get the
    // full markable list — NOT just Mathematics. The filter keeps only subjects
    // that actually have a paper structure / available papers.
    const allMarkable = Array.from(
      new Set([
        ...SUBJECTS.filter((s) => s.markingEnabled).map((s) => s.code),
        ...getIbMarkableSubjectCodes(),
      ])
    )
    const codes = profileSubjectCodes.length ? profileSubjectCodes : allMarkable
    return codes.filter(
      (code) =>
        availablePapers?.[code] ||
        getSubjectPaperStructure(code) ||
        getIbMarkableSubjectCodes().includes(code)
    )
  }, [profileSubjectCodes, availablePapers])

  const boardFilteredSubjects = useMemo(
    () =>
      profileSelectableSubjects.filter((code) =>
        subjectMatchesMarkBoard(code, selectedMarkBoard)
      ),
    [profileSelectableSubjects, selectedMarkBoard]
  )

  // IB catalog: subject options shown for the IB board (catalogued subjects first,
  // legacy profile codes they supersede filtered out). See /api/ib/catalog.
  const ibSubjectOptions = useMemo(() => {
    if (selectedMarkBoard !== 'ib') return boardFilteredSubjects
    const catalogCodes = ibCatalog.map((s) => s.code)
    const superseded = new Set(catalogCodes)
    const legacy = boardFilteredSubjects.filter(
      (code) => !superseded.has(code.replace(/-(hl|sl)$/i, ''))
    )
    return [...catalogCodes, ...legacy]
  }, [selectedMarkBoard, boardFilteredSubjects, ibCatalog])

  const catalogSubject = useMemo(
    () => ibCatalog.find((s) => s.code === selectedSubject) ?? null,
    [ibCatalog, selectedSubject]
  )
  const catalogLevels = useMemo<Array<'HL' | 'SL'>>(() => {
    if (!catalogSubject) return []
    if (catalogSubject.level_scope === 'HL_SL') return ['HL', 'SL']
    if (catalogSubject.level_scope === 'HL_only') return ['HL']
    if (catalogSubject.level_scope === 'SL_only') return ['SL']
    return []
  }, [catalogSubject])
  const effectiveIbLevel: 'HL' | 'SL' = catalogLevels.includes(ibLevel)
    ? ibLevel
    : catalogLevels[0] ?? 'SL'
  const catalogComponents = useMemo(
    () =>
      catalogSubject
        ? catalogSubject.components.filter(
            (c) => c.level === effectiveIbLevel || c.level === 'both'
          )
        : [],
    [catalogSubject, effectiveIbLevel]
  )
  // The selected component's marking model (points papers vs criteria essays/IA).
  const selectedCatalogComponent = useMemo(
    () => catalogComponents.find((c) => c.component_key === ibComponentKey) ?? null,
    [catalogComponents, ibComponentKey]
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
    if (selectedMarkBoard !== 'ib') return
    if (uploadMode === 'whole_paper') {
      setUploadMode('single_question')
    }
    if (markIntent === 'past_paper') {
      setMarkIntent('practice_question')
      setShowManualPaper(false)
    }
  }, [selectedMarkBoard, uploadMode, markIntent])

  useEffect(() => {
    if (
      profileLoading ||
      papersLoading ||
      selectedSubject ||
      markIntent === 'practice_question' ||
      markIntent === 'combined_script'
    ) {
      return
    }
    const pool = boardFilteredSubjects.length
      ? boardFilteredSubjects
      : profileSelectableSubjects
    const preferred =
      selectedMarkBoard === 'ib'
        ? pool[0]
        : pool.find((c) => c === '9709') ?? pool[0]
    if (preferred) {
      setSelectedSubject(preferred)
      if (selectedMarkBoard !== 'ib') {
        setShowManualPaper(true)
      }
    }
  }, [
    profileLoading,
    papersLoading,
    selectedSubject,
    boardFilteredSubjects,
    profileSelectableSubjects,
    markIntent,
    selectedMarkBoard,
  ])

  const isPracticeMode =
    uploadMode === 'single_question' && markIntent === 'practice_question'
  const isCombinedMode =
    uploadMode === 'single_question' && markIntent === 'combined_script'
  const hasAnswerUpload = answerPages.length > 0 || !!answerPdf

  const markModeCallout = useMemo(() => {
    if (uploadMode === 'whole_paper') {
      return 'Upload your full answer paper — we segment and mark each question against the official scheme.'
    }
    if (isCombinedMode) {
      return selectedMarkBoard === 'ib'
        ? 'One PDF or photo with the IB question and your answer together. We split them and mark band-by-band.'
        : 'One scan with question and answer together — worksheets, homework sheets, or textbook pages.'
    }
    if (isPracticeMode) {
      return selectedMarkBoard === 'ib'
        ? 'Homework or textbook practice — upload answer and question separately, or use Scanned script.'
        : 'Homework or textbook questions — photos or PDFs, marked with Cambridge conventions.'
    }
    if (selectedMarkBoard === 'ib') {
      return 'Pick My question or Scanned script. PDF drops welcome — past-paper lookup is Cambridge only.'
    }
    return 'Select a past paper question or add your own — photos and PDFs supported throughout.'
  }, [uploadMode, isCombinedMode, isPracticeMode, selectedMarkBoard])

  const markLearnMoreHref =
    selectedMarkBoard === 'ib' ? '/blog/ib-markbands-explained' : '/tools/command-words'
  const markLearnMoreLabel =
    selectedMarkBoard === 'ib' ? 'How IB markbands work' : 'What the command words mean'

  const ibManualCriteriaSummary =
    (isPracticeMode || isCombinedMode) &&
    selectedSubject &&
    isIbSubjectCode(selectedSubject)
      ? ibPracticeCriteriaSummary(selectedSubject)
      : null

  const hasPracticeQuestion =
    questionTextInput.trim().length >= 10 || !!questionPhoto

  // Why the submit button is disabled, in words — shown under the button so a
  // greyed-out CTA never leaves the user guessing.
  const submitDisabledReason = !hasAnswerUpload
    ? 'Add a photo or PDF of your answer to get started.'
    : hasCompressingPages(answerPages) || questionPhotoCompressing
      ? 'Preparing your files — just a moment…'
      : answerPdfError
        ? answerPdfError
        : submitBlocked
          ? 'You\u2019ve used today\u2019s marking allowance — upgrade or come back tomorrow.'
          : isCombinedMode && !selectedSubject
            ? 'Pick a subject above so we mark with the right criteria.'
            : isPracticeMode && !selectedSubject
              ? 'Pick a subject above so we mark with the right criteria.'
              : isPracticeMode && !hasPracticeQuestion
                ? 'Add the question (photo, PDF, or text) so we know what to mark against.'
                : null

  const isManualFilled = !!(
    selectedSubject &&
    selectedYear !== '' &&
    selectedSession &&
    selectedComponent &&
    (uploadMode === 'whole_paper' || questionNumber.trim())
  )

  // The tailored IB "Marks available" input already covers points-based IB
  // components — don't show a second marks field on top of it.
  const ibPointsMarksShown =
    (isPracticeMode || isCombinedMode) &&
    !!catalogSubject &&
    !!ibComponentKey &&
    selectedCatalogComponent?.assessment_model === 'points'
  // Show a per-question "total marks" control on every single-question upload
  // where the total would otherwise be inferred by the model. Hidden when an
  // official mark scheme supplies the total (isManualFilled) or the IB points
  // input is already shown.
  const showTotalMarksField =
    uploadMode === 'single_question' && !isManualFilled && !ibPointsMarksShown

  const wholePaperCode =
    selectedSubject && selectedComponent
      ? `${selectedSubject}/${selectedComponent}`
      : ''
  const wholePaperSession =
    selectedSession && selectedYear !== ''
      ? `${selectedSession} ${selectedYear}`
      : ''

  useEffect(() => {
    const paperCode =
      uploadMode === 'whole_paper'
        ? wholePaperCode
        : !isPracticeMode && selectedSubject && selectedComponent
          ? `${selectedSubject}/${selectedComponent}`
          : ''
    const paperSession =
      uploadMode === 'whole_paper'
        ? wholePaperSession
        : !isPracticeMode && selectedSession && selectedYear !== ''
          ? `${selectedSession} ${selectedYear}`
          : ''

    if (!paperCode || !paperSession) {
      setPaperQuestionOptions([])
      return
    }
    let cancelled = false
    fetch(
      `/api/mark/paper-questions?paper_code=${encodeURIComponent(paperCode)}&paper_session=${encodeURIComponent(paperSession)}`
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
  }, [
    uploadMode,
    wholePaperCode,
    wholePaperSession,
    isPracticeMode,
    selectedSubject,
    selectedComponent,
    selectedSession,
    selectedYear,
  ])

  const markingMode = isPracticeMode
    ? 'general'
    : showManualPaper || isManualFilled
      ? 'past_paper'
      : 'general'

  const omniContext = result?.attempt_id
    ? ({
        type: 'marking_result' as const,
        data: { attemptId: result.attempt_id },
      })
    : ({
        type: 'marking' as const,
        data: { mode: markingMode as 'past_paper' | 'general' },
      })

  useSetAIContext(omniContext, [result?.attempt_id, markingMode])

  function handleMarkBoardChange(next: MarkExamBoard) {
    setSelectedMarkBoard(next)
    if (selectedSubject && !subjectMatchesMarkBoard(selectedSubject, next)) {
      setSelectedSubject('')
      setSelectedYear('')
      setSelectedSession('')
      setSelectedComponent('')
    }
    if (next === 'ib') {
      if (uploadMode === 'single_question' && markIntent === 'past_paper') {
        setMarkIntent('practice_question')
        setShowManualPaper(false)
      }
      if (uploadMode === 'whole_paper') {
        setUploadMode('single_question')
        setMarkIntent(
          markIntent === 'combined_script' ? 'combined_script' : 'practice_question'
        )
        setShowManualPaper(false)
      }
    }
    setErrorMsg('')
  }

  function handleSubjectChange(value: string) {
    if (value) {
      const nextBoard = subjectMatchesMarkBoard(value, 'ib') ? 'ib' : 'cambridge'
      if (nextBoard !== selectedMarkBoard) {
        setSelectedMarkBoard(nextBoard)
        if (nextBoard === 'ib') {
          setUploadMode('single_question')
          setMarkIntent('practice_question')
          setShowManualPaper(false)
        }
      }
    }
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
    if (loading || submittingRef.current) return
    submittingRef.current = true
    // Claim this run. Anything arriving from an earlier stream is ignored from
    // here on, and the earlier request is torn down so it stops costing us a
    // socket (and stops generating a rewrite nobody will see).
    const runId = ++markRunSeqRef.current
    const isCurrentRun = () => markRunSeqRef.current === runId
    markAbortRef.current?.abort()
    const abortController = new AbortController()
    markAbortRef.current = abortController
    flushSync(() => {
      setLoading(true)
    })

    const releaseSubmit = () => {
      // A superseded run must not clear the lock held by the run that replaced
      // it — that would let a third submit start while #2 is still in flight.
      if (!isCurrentRun()) return
      submittingRef.current = false
    }

    try {
      if (!hasAnswerUpload) {
        setLoading(false)
        releaseSubmit()
        setErrorMsg('Upload at least one page or a PDF of your answer.')
        return
      }
      if (hasCompressingPages(answerPages)) {
        setLoading(false)
        releaseSubmit()
        setErrorMsg('Still preparing your images — wait a moment.')
        return
      }
      if (questionPhotoCompressing) {
        setLoading(false)
        releaseSubmit()
        setErrorMsg('Still preparing your question photo — wait a moment.')
        return
      }
      if (uploadMode === 'whole_paper') {
        setLoading(false)
        releaseSubmit()
        setErrorMsg('Use the whole-paper upload area to submit your pages.')
        return
      }

      if (isPracticeMode) {
        if (!selectedSubject) {
          setLoading(false)
          releaseSubmit()
          setErrorMsg('Select a subject so we can apply the right mark scheme style.')
          return
        }
        if (!hasPracticeQuestion) {
          setLoading(false)
          releaseSubmit()
          setErrorMsg(
            'Add your question — type it or upload a photo or PDF — before marking.'
          )
          return
        }
      }

      if (isCombinedMode) {
        if (!selectedSubject) {
          setLoading(false)
          releaseSubmit()
          setErrorMsg('Select a subject so we can apply the right mark scheme style.')
          return
        }
      }

      setMarkProgress({ percent: 5, stage: 'reading_work' })
      setMarkContext(null)
      setMarkStreamError(null)
      setErrorMsg('')
      setErrorRetryable(false)
      setResult(null)
      setShowingExample(false)
      setPendingResult(null)
      pendingResultRef.current = null

      const { pageFiles, answerPdf: preparedPdf, questionFile, error: payloadError } =
        await prepareSingleQuestionUpload(answerPages, {
          answerPdf,
          questionFile: questionPhoto,
          questionCompressing: questionPhotoCompressing,
        })
      if (payloadError) {
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        setErrorMsg(payloadError)
        return
      }

      const formData = new FormData()
      pageFiles.forEach((file, i) => {
        formData.append(`pages[${i}]`, file)
      })
      if (pageFiles.length === 1) {
        formData.append('photo', pageFiles[0])
      }
      if (preparedPdf) {
        formData.append('answer_pdf', preparedPdf)
      }
      formData.append('upload_mode', uploadMode)
      formData.append('mark_intent', markIntent)
      formData.append('stream', '1')
      // Always forward the chosen subject, even without a full paper selection,
      // so freeform marks get syllabus-tagged and feed mastery/review.
      if (selectedSubject) formData.append('subject_code', selectedSubject)
      if (questionFile) {
        formData.append('question_photo', questionFile)
      }
      if (questionTextInput.trim()) formData.append('question_text', questionTextInput)

      // Per-question total marks: send the user-entered denominator unless they
      // ticked "the marks are shown in my question" (then the marker reads it
      // from the question image/text). The backend still prefers an official
      // mark-scheme total over this when one is available.
      if (showTotalMarksField && !marksInQuestion && totalMarksInput.trim()) {
        formData.append('total_marks_available', totalMarksInput.trim())
      }

      if (isPracticeMode && selectedSubject) {
        formData.append('practice_subject_code', selectedSubject)
        // M1: IB catalogued subject → send level + component so marking routes
        // through the catalog points/criteria path.
        if (catalogSubject && ibComponentKey) {
          formData.append('ib_level', effectiveIbLevel)
          formData.append('ib_component_key', ibComponentKey)
          if (ibMarksAvailable.trim()) {
            formData.append('ib_marks_available', ibMarksAvailable.trim())
          }
        }
      }

      if (isCombinedMode && selectedSubject) {
        formData.append('practice_subject_code', selectedSubject)
        if (catalogSubject && ibComponentKey) {
          formData.append('ib_level', effectiveIbLevel)
          formData.append('ib_component_key', ibComponentKey)
          if (ibMarksAvailable.trim()) {
            formData.append('ib_marks_available', ibMarksAvailable.trim())
          }
        }
      }

      if (
        !isPracticeMode &&
        selectedSubject &&
        selectedYear !== '' &&
        selectedSession &&
        selectedComponent
      ) {
        formData.append(
          'manual_paper_code',
          `${selectedSubject}/${selectedComponent}`
        )
        formData.append(
          'manual_paper_session',
          `${selectedSession} ${selectedYear}`
        )
        if (uploadMode === 'single_question' && questionNumber.trim()) {
          formData.append(
            'manual_question_number',
            normalizeQuestionNumber(questionNumber.trim())
          )
        }
      }

      const res = await fetch('/api/mark/process', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        // Cap breach (only happens in 'enforce' mode). Show the upgrade modal.
        if (data?.error === 'mark_quota_exceeded') {
          const tier = (data.tier ?? 'free') as SubscriptionTier
          setUpgradeModal({
            variant: 'cap',
            tier,
            cap: capForTier(tier),
            periodResetsAt: data.period_resets_at ?? null,
            creditBalance: data.credit_balance ?? 0,
          })
          refreshBillingSummary()
          return
        }
        if (res.status === 429 && !billingSummary?.signedIn) {
          setUpgradeModal({ variant: 'anonymous' })
          return
        }
        setErrorMsg(
          data.error ||
            'Marking failed — please try again. If it keeps happening, re-upload a clearer photo or PDF.'
        )
        setErrorRetryable(data.retryable ?? true)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalPayload: MarkingResult | null = null
      const streamCtx = {
        setMarkProgress,
        setMarkContext,
        setMarkStreamError,
        setErrorMsg,
        setErrorRetryable,
        setLoading,
        questionNumber,
      }

      const consumeStreamPart = (part: string): boolean => {
        // A superseded run must not touch state belonging to the current one.
        if (!isCurrentRun()) return true
        const event = parseMarkStreamPart(part)
        if (!event) return false
        // The premium rewrite arrives after the result — patch it into whatever
        // the user is already looking at rather than holding the score back.
        if (event.type === 'rewrite' && event.rewrite) {
          applyRewritePatch(event.rewrite, event.attempt_id ?? null)
          return false
        }
        const outcome = handleMarkStreamEvent(event, streamCtx)
        if (outcome === 'error') return true
        if (outcome === 'result' && event.payload) {
          finalPayload = event.payload as MarkingResult
          // Begin the reveal the moment the marks land. The stream may stay
          // open afterwards for the rewrite; waiting for it to close would
          // reintroduce exactly the delay the deferral removed.
          pendingResultRef.current = finalPayload
          setPendingResult(finalPayload)
        }
        return false
      }

      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>
        try {
          chunk = await reader.read()
        } catch (streamErr) {
          // Superseded by a newer mark, or deliberately aborted: not an error
          // the user should ever see.
          if (!isCurrentRun() || abortController.signal.aborted) return
          // The marks already landed and the stream was only still open for the
          // premium rewrite. Losing the connection now costs the rewrite panel
          // and nothing else — showing the full-screen "marking failed" overlay
          // would bury a correct, already-charged result under a Retry button
          // that re-charges the user.
          if (finalPayload) {
            console.warn(
              '[mark] stream dropped after the result was delivered; rewrite skipped',
              streamErr
            )
            releaseSubmit()
            return
          }
          const { message, retryable } = formatClientMarkError(streamErr)
          setLoading(false)
          releaseSubmit()
          setMarkProgress(null)
          setMarkStreamError(message)
          setErrorMsg(message)
          setErrorRetryable(retryable)
          return
        }
        const { done, value } = chunk
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (consumeStreamPart(part)) {
            releaseSubmit()
            return
          }
        }
      }

      if (buffer.trim() && consumeStreamPart(buffer)) {
        releaseSubmit()
        return
      }

      // The payload was buffered as soon as the `result` event arrived (above),
      // which hands off to the cinematic wait; marking stays "in flight" until
      // onReveal commits it. Reaching the end of the stream with nothing means
      // the function died without sending a result.
      if (!finalPayload && isCurrentRun()) {
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        setMarkContext(null)
        setMarkStreamError(null)
        setErrorMsg('Marking finished without a result. Your photos are still here.')
        setErrorRetryable(true)
      }
    } catch (err) {
      // An abort means a newer mark took over (or the page tore down) — the
      // user is already looking at that run, so surfacing this would be a lie.
      if (!isCurrentRun() || abortController.signal.aborted) return
      setLoading(false)
      submittingRef.current = false
      setMarkProgress(null)
      const { message, retryable } = formatClientMarkError(err)
      setMarkStreamError(message)
      setErrorMsg(message)
      setErrorRetryable(retryable)
    }
  }

  // The premium full-marks rewrite is generated after the score is delivered,
  // so it has to be merged into whichever copy of the result is live: the
  // buffered one if the reveal animation is still running, the committed one if
  // the user is already reading their marks. Patching all three keeps them in
  // sync regardless of which arrives first.
  const applyRewritePatch = useCallback(
    (rewrite: FullMarksRewritePayload, attemptId: string | null) => {
      // Only patch the attempt the rewrite was generated for. A rewrite that
      // hits Gemini retries can outlive its own mark; without this check it
      // would graft a model answer for question 1 onto the result of question 2
      // — visibly wrong, and invisible again on reload since the DB is correct.
      const patch = (prev: MarkingResult | null): MarkingResult | null =>
        prev && (!attemptId || prev.attempt_id === attemptId)
          ? {
              ...prev,
              ai_marking: { ...prev.ai_marking, full_marks_rewrite: rewrite },
            }
          : prev
      pendingResultRef.current = patch(pendingResultRef.current)
      setPendingResult(patch)
      setResult(patch)
    },
    []
  )

  const openExample = useCallback(() => {
    setResult(DEMO_MARK_RESULT as MarkingResult)
    setShowingExample(true)
    setErrorMsg('')
    setMarkStreamError(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [])

  const closeExample = useCallback(() => {
    setResult(null)
    setShowingExample(false)
    // Drop the ?example flag so a refresh (or a back-navigation) doesn't drag
    // the sample back over the upload form the user just asked for.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has(DEMO_MARK_QUERY_PARAM)) {
        url.searchParams.delete(DEMO_MARK_QUERY_PARAM)
        window.history.replaceState(null, '', url.toString())
      }
      window.scrollTo({ top: 0 })
    }
  }, [])

  // Deep link from onboarding: land straight on the finished example.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get(DEMO_MARK_QUERY_PARAM) === '1') openExample()
  }, [openExample])

  // Called by the cinematic wait once it is ready to hand off. Commits the
  // buffered payload to the results view and tears down the wait surface so the
  // simulated examiner ink dissolves into the real ExaminerInkOverlay.
  const handleReveal = useCallback(() => {
    const payload = pendingResultRef.current
    if (!payload) return
    setResult(payload)
    setLoading(false)
    submittingRef.current = false
    setMarkProgress(null)
    setMarkContext(null)
    setMarkStreamError(null)
    setPendingResult(null)
    pendingResultRef.current = null
    handleAllowance(payload._allowance)
    void fetch('/api/celebrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'first_mark' }),
    })
      .then((r) => r.json())
      .then((data: { show?: boolean }) => {
        if (data.show) setFirstMarkCelebration(true)
      })
      .catch((err) => console.error('mark: celebrations check failed', err))
  }, [])

  function resetForm() {
    setResult(null)
    setPendingResult(null)
    pendingResultRef.current = null
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

  // Apply the `_allowance` block from a successful mark: refresh the header chip,
  // set the approaching-limit banner (only set by the API in warn/enforce), and
  // nudge free users to explore plans (any mode).
  function handleAllowance(block?: AllowanceBlock) {
    refreshBillingSummary()
    if (block?.tier === 'free') setShowFreeNudge(true)
  }

  return (
    <main className="app-shell app-shell-tabbed ms-mark-shell">
      <div
        className={`ms-mark-pg min-w-0 ${result ? '' : 'ms-mark-pg--narrow'}`}
      >
        {!result && (
          <header className="ms-mark-hero ms-fade-in">
            <p className="ms-overline ms-mark-hero-eyebrow">Mark a question</p>
            <h2 className="ms-mark-hero-title">
              {selectedMarkBoard === 'ib' ? 'IB examiner-style feedback' : 'Cambridge examiner-style feedback'}
            </h2>
            <p className="ms-mark-hero-lead">
              Upload photos or PDFs — marked in about a minute with{' '}
              {selectedMarkBoard === 'ib' ? 'criterion bands' : 'official mark scheme logic'}.
            </p>
          </header>
        )}
        <MarkStepsBar stage={markStage} />

        {!result && practiceContext && (
          <div className="ms-mark-context-card ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                Practicing: {practiceContext.pattern}
              </p>
              {practiceContext.reason && (
                <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  Why this question helps: {practiceContext.reason}
                </p>
              )}
            </div>
          </div>
        )}

        {!result && !practiceContext && courseTopicContext && (
          <div className="ms-mark-context-card ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                From your course: {courseTopicContext.topicName}
                {courseTopicContext.topicCode !== courseTopicContext.topicName
                  ? ` (${courseTopicContext.topicCode})`
                  : ''}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                {courseTopicContext.ibPractice
                  ? 'IB criterion practice — upload your answer below. We mark band-by-band against the official assessment criteria.'
                  : courseTopicContext.foundQuestion && courseTopicContext.paperLabel
                    ? `We picked ${courseTopicContext.paperLabel} from our mark scheme bank — upload your answer below.`
                    : 'Select a past paper question on this topic, or upload your answer and we will detect the paper.'}
              </p>
              {courseTopicContext.ibPractice && courseTopicContext.criteriaSummary ? (
                <p className="mt-2 text-xs font-medium text-[var(--ec-brand)]">
                  {courseTopicContext.criteriaSummary}
                </p>
              ) : null}
              {courseTopicContext.returnTo ? (
                <Link
                  href={courseTopicContext.returnTo}
                  className="ec-link mt-2 inline-flex items-center gap-1 text-sm font-medium"
                >
                  Back to lesson
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {!result && !practiceContext && !courseTopicContext && ibManualCriteriaSummary && (
          <div className="ms-mark-context-card ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                IB criterion practice — {resolveSubjectLabel(selectedSubject)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                {isCombinedMode
                  ? 'Upload one PDF or photo with the question and your answer — we split them and mark band-by-band.'
                  : 'Upload your answer (and question separately, or use Scanned script). We mark band-by-band against IB assessment criteria.'}
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--ec-brand)]">
                {ibManualCriteriaSummary}
              </p>
            </div>
          </div>
        )}

        {!result && (
          <BillingLimitBanner className="mb-5" />
        )}

        {!result && !loading && <GuestMarkNotice className="mb-5" />}

        {/* The biggest leak on this page is people who never upload at all.
            Offer the finished article before asking for the commitment. */}
        {!result && !loading && (
          <MarkExampleInvite onOpen={openExample} className="mb-5" />
        )}

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="ms-mark-form-shell space-y-8">
            <section className="ms-mark-setup-panel ms-fade-in ms-stag-1">
            <MarkBoardPicker
              value={selectedMarkBoard}
              onChange={handleMarkBoardChange}
              disabled={profileLoading}
            />

            <div className="ms-mark-mode-panel">
            <div className="ms-lvl-tabs-scroll">
            <div
              className="ms-lvl-tabs"
              role="tablist"
              aria-label="Mark mode"
              aria-describedby="mark-mode-callout"
            >
              <button
                type="button"
                role="tab"
                aria-selected={uploadMode === 'single_question' && markIntent === 'past_paper'}
                aria-disabled={selectedMarkBoard === 'ib'}
                tabIndex={selectedMarkBoard === 'ib' ? -1 : 0}
                onClick={() => {
                  if (selectedMarkBoard === 'ib') return
                  setUploadMode('single_question')
                  setMarkIntent('past_paper')
                }}
                className={`ms-lvl-tab ${uploadMode === 'single_question' && markIntent === 'past_paper' ? 'on' : ''}${selectedMarkBoard === 'ib' ? ' is-disabled' : ''}`}
              >
                Single question
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isPracticeMode}
                onClick={() => {
                  setUploadMode('single_question')
                  setMarkIntent('practice_question')
                  setShowManualPaper(false)
                }}
                className={`ms-lvl-tab ${isPracticeMode ? 'on' : ''}`}
              >
                My question
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isCombinedMode}
                onClick={() => {
                  setUploadMode('single_question')
                  setMarkIntent('combined_script')
                  setShowManualPaper(false)
                }}
                className={`ms-lvl-tab ${isCombinedMode ? 'on' : ''}`}
              >
                Scanned script
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={uploadMode === 'whole_paper'}
                aria-disabled={selectedMarkBoard === 'ib'}
                tabIndex={selectedMarkBoard === 'ib' ? -1 : 0}
                onClick={() => {
                  if (selectedMarkBoard === 'ib') return
                  setUploadMode('whole_paper')
                }}
                className={`ms-lvl-tab ${uploadMode === 'whole_paper' ? 'on' : ''}${selectedMarkBoard === 'ib' ? ' is-disabled' : ''}`}
              >
                Whole paper
              </button>
            </div>
            </div>
            <p
              id="mark-mode-callout"
              className="ms-mark-mode-callout"
            >
              {markModeCallout}{' '}
              <Link href={markLearnMoreHref} className="ec-link">
                {markLearnMoreLabel}
              </Link>
            </p>
            </div>
            </section>

            {uploadMode === 'whole_paper' && (
            <section>
              <div className="ec-card ec-card-rounded-lg space-y-4 p-5 sm:p-6">
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
                    {boardFilteredSubjects.map((code) => {
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
                  <div className="rounded-2xl border ec-border-color ec-bg-surface-raised p-4">
                    <p className="label-overline mb-3">Available papers</p>
                    <ul className="space-y-1.5 text-sm text-[var(--ec-text-secondary)]">
                      {paperStructure.papers.map((p) => (
                        <li key={p.paper}>
                          <span className="font-medium text-[var(--ec-text-primary)]">{p.name}</span>
                          <span className="font-mono text-xs opacity-70">
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
            )}
            {uploadMode === 'whole_paper' ? (
              <section className="animate-entry stagger-1 space-y-4">
                <StepLabel number={1} label="Upload your full answer paper" />
                {!isManualFilled ? (
                  <div className="ec-card p-5 text-sm text-[var(--ec-text-secondary)]">
                    Select subject, year, session, and paper below before uploading
                    your pages.
                  </div>
                ) : (
                  <>
                    {billingSummary?.signedIn && billingSummary.access === 'free' && (
                      <div className="ec-banner-warning-inline rounded-xl px-4 py-3 text-sm">
                        <span className="font-semibold">Free preview:</span>{' '}
                        we mark up to {FREE_WHOLE_PAPER_QUESTION_LIMIT} questions per
                        whole-paper upload.{' '}
                        <Link
                          href="/pricing"
                          className="ec-link"
                        >
                          Upgrade for full papers →
                        </Link>
                      </div>
                    )}
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
                    onQuotaExceeded={(data) => {
                      const tier = (data.tier ?? 'free') as SubscriptionTier
                      setUpgradeModal({
                        variant: 'cap',
                        tier,
                        cap: capForTier(tier),
                        periodResetsAt: data.period_resets_at ?? null,
                        creditBalance: data.credit_balance ?? 0,
                      })
                      refreshBillingSummary()
                    }}
                    onAllowance={handleAllowance}
                    onGuestRateLimit={() => setUpgradeModal({ variant: 'anonymous' })}
                    disabled={submitBlocked}
                  />
                  </>
                )}
              </section>
            ) : (
            <div className="ms-upload-grid ms-fade-in ms-stag-2">
              <div className="ms-mark-upload-zone ec-section-tint ec-section-tint--learn">
                <StepLabel
                  number={1}
                  label={
                    isCombinedMode
                      ? 'Upload your worksheet or script'
                      : 'Upload your answer'
                  }
                  hint={isCombinedMode ? 'question + working on same file' : 'photos or PDF'}
                />
                <PageUploader
                  pages={answerPages}
                  onPagesChange={setAnswerPages}
                  allowPdf
                  pdfFile={answerPdf}
                  onPdfChange={setAnswerPdf}
                  onPdfError={setAnswerPdfError}
                  disabled={loading}
                  emptyLabel={
                    isCombinedMode
                      ? 'Drop your script here'
                      : 'Drop your working here'
                  }
                  emptyHint={
                    isCombinedMode
                      ? 'photos or PDF — question and answer together'
                      : 'photos, camera, or PDF — multi-page is fine'
                  }
                />
              </div>
              <div className="ms-mark-form-card">
                <StepLabel
                  number={2}
                  label={
                    isCombinedMode
                      ? 'Subject'
                      : isPracticeMode
                        ? 'Your question & subject'
                        : 'Which paper is this?'
                  }
                />
                <div className="ms-mark-form-body space-y-4">
                  {(isPracticeMode || isCombinedMode) && (
                <>
                  <div>
                    <Label htmlFor="mark-subject" className="label-overline mb-2 inline-block">
                      {selectedMarkBoard === 'ib' ? 'IB subject' : 'Subject'}
                    </Label>
                    {boardFilteredSubjects.length === 0 ? (
                      <p className="text-sm text-[var(--ec-text-secondary)]">
                        No {selectedMarkBoard === 'ib' ? 'IB' : 'Cambridge'} subjects in your
                        profile yet.{' '}
                        <Link href="/onboarding?rerun=1" className="ec-link font-medium">
                          Update subjects
                        </Link>
                      </p>
                    ) : (
                    <select
                      id="mark-subject"
                      value={selectedSubject}
                      onChange={(e) => {
                        handleSubjectChange(e.target.value)
                        setShowManualPaper(true)
                        setIbComponentKey('')
                      }}
                      disabled={profileLoading || papersLoading}
                      className="ec-input select-chevron appearance-none"
                    >
                      <option value="">
                        {profileLoading ? 'Loading your subjects…' : 'Select subject…'}
                      </option>
                      {(selectedMarkBoard === 'ib' ? ibSubjectOptions : boardFilteredSubjects).map((code) => {
                        const catalog = ibCatalog.find((s) => s.code === code)
                        const meta = getSubjectByCode(code)
                        const label =
                          catalog?.name ??
                          availablePapers?.[code]?.subject ??
                          meta?.label ??
                          resolveSubjectLabel(code)
                        return (
                          <option key={code} value={code}>
                            {selectedMarkBoard === 'ib' ? label : `${label} (${code})`}
                          </option>
                        )
                      })}
                    </select>
                    )}
                  </div>
                </>
              )}

              {(isPracticeMode || isCombinedMode) && catalogSubject && (
                <div className="space-y-3 rounded-2xl border ec-border-color ec-bg-surface-raised p-4">
                  <p className="label-overline">IB assessment</p>
                  {catalogLevels.length > 1 && (
                    <div>
                      <Label htmlFor="ib-level" className="label-overline mb-2 inline-block">
                        Level
                      </Label>
                      <select
                        id="ib-level"
                        value={effectiveIbLevel}
                        onChange={(e) => {
                          setIbLevel(e.target.value as 'HL' | 'SL')
                          setIbComponentKey('')
                        }}
                        className="ec-input select-chevron appearance-none"
                      >
                        {catalogLevels.map((lv) => (
                          <option key={lv} value={lv}>
                            {lv}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="ib-component" className="label-overline mb-2 inline-block">
                      Component
                    </Label>
                    <select
                      id="ib-component"
                      value={ibComponentKey}
                      onChange={(e) => {
                        setIbComponentKey(e.target.value)
                        setIbMarksAvailable('')
                      }}
                      className="ec-input select-chevron appearance-none"
                    >
                      <option value="">Select component…</option>
                      {catalogComponents.map((c) => (
                        <option key={`${c.component_key}-${c.level}`} value={c.component_key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {ibComponentKey && selectedCatalogComponent?.assessment_model === 'points' && (
                    <div>
                      <Label htmlFor="ib-marks" className="label-overline mb-2 inline-block">
                        Marks available (optional)
                      </Label>
                      <input
                        id="ib-marks"
                        type="number"
                        min={1}
                        max={100}
                        inputMode="numeric"
                        value={ibMarksAvailable}
                        onChange={(e) => setIbMarksAvailable(e.target.value)}
                        placeholder="e.g. 7"
                        className="ec-input"
                      />
                      <p className="mt-1 text-xs ec-text-secondary">
                        If your question states a mark total, enter it so we mark out of the
                        right number. Leave blank and we&apos;ll read it from the script.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isPracticeMode && (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
                    Paste or upload the question from your textbook, worksheet, or notes. Add{' '}
                    <strong className="text-[var(--ec-text-primary)]">one</strong> — photo, PDF,{' '}
                    <em>or</em> typed text. We need the exact wording to mark your answer
                    accurately.
                  </p>

                  <QuestionUploadField
                    id="practice-question-photo"
                    label="Photo or PDF of the question"
                    file={questionPhoto}
                    onChange={setQuestionPhoto}
                    disabled={loading}
                    compressing={questionPhotoCompressing}
                    onCompressingChange={setQuestionPhotoCompressing}
                  />

                  <div className="ms-mark-or-divider" aria-hidden="true">
                    <span>or type it</span>
                  </div>

                  <div>
                    <Label htmlFor="practice-question-text" className="label-overline mb-2 inline-block">
                      Type the question
                    </Label>
                    <textarea
                      id="practice-question-text"
                      value={questionTextInput}
                      onChange={(e) => setQuestionTextInput(e.target.value)}
                      rows={4}
                      placeholder="e.g., Explain why the rate of photosynthesis increases with light intensity up to a plateau."
                      className="ec-input ec-question-text"
                    />
                  </div>
                </div>
              )}

              {isPracticeMode ? (
                <MarkingModeHint mode="practice" markBoard={selectedMarkBoard} />
              ) : isCombinedMode ? (
                <MarkingModeHint mode="combined" markBoard={selectedMarkBoard} />
              ) : null}

              {!isPracticeMode && papersError && (
                <div className="ec-banner ec-banner-info" role="alert">
                  <p className="ec-banner__title">Couldn&apos;t load the paper catalog</p>
                  <p className="ec-banner__meta mt-1">
                    The paper dropdowns may look empty. Check your connection, then{' '}
                    <button
                      type="button"
                      className="ec-link underline"
                      onClick={() => setPapersReloadKey((k) => k + 1)}
                    >
                      retry loading papers
                    </button>
                    .
                  </p>
                </div>
              )}

              {!isPracticeMode && (
                <PastPaperSelectorFields
                  markBoard={selectedMarkBoard}
                  selectedSubject={selectedSubject}
                  selectedYear={selectedYear}
                  selectedSession={selectedSession}
                  selectedComponent={selectedComponent}
                  questionNumber={questionNumber}
                  availableYears={availableYears}
                  availableSeasons={availableSeasons}
                  availableComponents={availableComponents}
                  paperQuestionOptions={paperQuestionOptions}
                  papersLoading={papersLoading || profileLoading}
                  profileSelectableSubjects={boardFilteredSubjects}
                  availablePapers={availablePapers}
                  componentLabel={componentLabel}
                  onSubjectChange={(value) => {
                    handleSubjectChange(value)
                    setShowManualPaper(true)
                  }}
                  onYearChange={handleYearChange}
                  onSessionChange={handleSessionChange}
                  onComponentChange={setSelectedComponent}
                  onQuestionNumberChange={setQuestionNumber}
                  onSchemeFound={setSchemeInDb}
                />
              )}

              {!isPracticeMode ? (
                <MarkingModeHint
                  markBoard={selectedMarkBoard}
                  mode={
                    isManualFilled && schemeInDb === true
                      ? 'official'
                      : isManualFilled && schemeInDb === false
                        ? 'missing_paper'
                        : 'general'
                  }
                />
              ) : null}

              {/* Optional question photo/text — past paper only */}
              {!isPracticeMode && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="inline-flex items-center gap-1.5 text-sm ec-link"
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
                    <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
                      If your handwritten work doesn&apos;t show the question or paper
                      header, add it here so we can mark more accurately — photo or PDF.
                    </p>

                    <QuestionUploadField
                      id="question-photo"
                      label="Photo or PDF of the question"
                      file={questionPhoto}
                      onChange={setQuestionPhoto}
                      disabled={loading}
                      compressing={questionPhotoCompressing}
                      onCompressingChange={setQuestionPhotoCompressing}
                    />

                    <div className="ms-mark-or-divider" aria-hidden="true">
                      <span>or type it</span>
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
              )}

                  {billingSummaryError && (
                    <p className="mb-3 rounded-xl border ec-tint-info-chip px-4 py-2 text-center text-xs">
                      Couldn&apos;t check your remaining allowance — marking may be declined if
                      you&apos;re at your cap.{' '}
                      <button
                        type="button"
                        className="ec-link underline"
                        onClick={() => window.dispatchEvent(new Event('ec:billing-refresh'))}
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  {showTotalMarksField && (
                    <div className="ec-card mb-4 space-y-3 p-4 sm:p-5">
                      <Label
                        htmlFor="total-marks"
                        className="label-overline inline-block"
                      >
                        Total marks for this question
                      </Label>
                      {!marksInQuestion && (
                        <input
                          id="total-marks"
                          type="number"
                          min={1}
                          max={100}
                          inputMode="numeric"
                          value={totalMarksInput}
                          onChange={(e) => setTotalMarksInput(e.target.value)}
                          placeholder="e.g. 25"
                          className="ec-input"
                        />
                      )}
                      <label className="flex cursor-pointer items-start gap-2 text-xs ec-text-secondary">
                        <input
                          type="checkbox"
                          checked={marksInQuestion}
                          onChange={(e) => setMarksInQuestion(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          The marks are shown in the question I uploaded — read the
                          total from there.
                        </span>
                      </label>
                      <p className="text-xs ec-text-secondary">
                        {marksInQuestion
                          ? 'We’ll read the mark total from your question image or text.'
                          : 'Enter the mark total so we mark out of the right number. Leave blank and we’ll try to read it from your question.'}
                      </p>
                    </div>
                  )}
                  <div className="ms-mark-submit-panel">
                  <MarkUsageIndicator variant="single" summary={billingSummary} className="mb-3" />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    loadingMode="progress"
                    loadingText="Marking your answer…"
                    disabled={
                      !hasAnswerUpload ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing ||
                      !!answerPdfError ||
                      submitBlocked ||
                      (isPracticeMode &&
                        (!selectedSubject || !hasPracticeQuestion)) ||
                      (isCombinedMode && !selectedSubject)
                    }
                    pulse={
                      hasAnswerUpload &&
                      !loading &&
                      (isCombinedMode
                        ? !!selectedSubject
                        : !isPracticeMode ||
                          (!!selectedSubject && hasPracticeQuestion))
                    }
                    leftIcon={!loading ? <Sparkles className="h-5 w-5" /> : undefined}
                    className="mark-submit-btn justify-center text-base"
                  >
                    {isCombinedMode
                      ? 'Mark my script'
                      : isPracticeMode
                        ? 'Mark my question'
                        : 'Mark my answer →'}
                  </Button>
                  {!loading && submitDisabledReason && (
                    <p
                      className="mt-2.5 text-center text-xs text-[var(--ec-text-secondary)]"
                      role="status"
                    >
                      {submitDisabledReason}
                    </p>
                  )}
                  {!isPracticeMode && isManualFilled && (
                    <p className="ms-micro text-center" style={{ marginTop: 10 }}>
                      USES THE OFFICIAL {selectedSubject}/{selectedComponent} MARK SCHEME
                    </p>
                  )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {errorMsg && !loading && !markStreamError && (
              <FormErrorAlert
                message={errorMsg}
                variant={errorRetryable ? 'warning' : 'error'}
              >
                {errorRetryable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('')
                      setErrorRetryable(false)
                      void handleSubmit({
                        preventDefault: () => {},
                      } as React.FormEvent)
                    }}
                    disabled={
                      loading ||
                      !hasAnswerUpload ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing ||
                      !!answerPdfError
                    }
                    className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--ec-chip-warning-text)_40%,transparent)] bg-[var(--ec-chip-warning-bg)] px-4 py-2 text-sm font-medium text-[var(--ec-banner-warning-title)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                ) : null}
              </FormErrorAlert>
            )}
          </form>
        )}

        {!result && !loading && <PageHelpStrip className="mt-10" />}

        <AnimatePresence>
          {((cinematicActive) || markStreamError) && (
            <motion.div
              key="marking-progress"
              className="fixed inset-0 z-[55] overflow-x-clip overflow-y-auto overscroll-contain bg-[var(--ec-canvas)] px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] lg:relative lg:inset-auto lg:z-auto lg:mt-10 lg:overflow-visible lg:bg-transparent lg:p-0 lg:pb-0 lg:pt-0"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <CinematicMarkingExperience
                stage={markProgress?.stage ?? 'reading_work'}
                context={markContext}
                imageUrl={answerPages[0]?.previewUrl ?? null}
                resultReady={!!pendingResult}
                lineReferences={pendingResult?.line_references ?? null}
                onReveal={handleReveal}
                error={markStreamError}
                onRetry={
                  errorRetryable
                    ? () => {
                        setMarkStreamError(null)
                        setErrorMsg('')
                        setErrorRetryable(false)
                        void handleSubmit({
                          preventDefault: () => {},
                        } as React.FormEvent)
                      }
                    : undefined
                }
                onBackToUpload={() => {
                  setLoading(false)
                  setMarkStreamError(null)
                  setMarkProgress(null)
                  setMarkContext(null)
                  setErrorMsg('')
                  setErrorRetryable(false)
                }}
                retryDisabled={
                  loading ||
                  !hasAnswerUpload ||
                  hasCompressingPages(answerPages) ||
                  questionPhotoCompressing ||
                  !!answerPdfError
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {result?.whole_paper && (
          <div className="space-y-8">
            {result.multi_question && (
              <div className="ec-card flex items-start gap-3 border-[var(--ec-brand)]/30 p-4">
                <Sparkles
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--ec-text-secondary)]">
                  We found{' '}
                  <strong className="text-[var(--ec-text-primary)]">
                    {result.whole_paper.questions.length} questions
                  </strong>{' '}
                  in your upload and marked each one separately below.
                </p>
              </div>
            )}
            <WholePaperResultView
              result={result.whole_paper}
              attemptId={result.attempt_id ?? null}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleMarkNewQuestion}
                className="ec-btn-primary"
              >
                Mark another
              </button>
            </div>
          </div>
        )}

        {result && !result.whole_paper && (
          <div className="space-y-8">
            {showingExample && <MarkExampleBanner onDismiss={closeExample} />}

            {practiceContext?.returnTo === 'progress' && (
              <Link
                href="/dashboard/progress?tab=insights&drilled=1"
                className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 p-4 transition-colors hover:border-[var(--ec-brand)]/50"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                      Practice complete
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
                      See how this changed your insights for {practiceContext.pattern}.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]">
                  See updated insights
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            )}

            {courseTopicContext?.returnTo ? (
              <Link
                href={courseTopicContext.returnTo}
                className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 p-4 transition-colors hover:border-[var(--ec-brand)]/50"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                      Back to {courseTopicContext.topicName}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
                      Return to the lesson and keep studying this topic.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]">
                  Back to lesson
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ) : null}

            <MarkingResultView
              result={result}
              attemptId={result.attempt_id ?? null}
              isPaid={
                billingSummary ? hasPaidAccess(billingSummary.access) : undefined
              }
              inkPages={
                result.ink_pages ??
                (result.answer_photo_url && result.line_references?.length
                  ? [
                      {
                        photo_url: result.answer_photo_url,
                        line_references: result.line_references,
                      },
                    ]
                  : undefined)
              }
            />

            {result.attempt_id && (
              <SolutionSection attemptId={result.attempt_id} />
            )}

            {/* The example is a demo, not an attempt: no progress to review and
                nothing to mark "again", so it gets its own single exit. */}
            {/* Asked once per attempt, while the marking is still on screen —
                the only place a student can judge whether it was fair. */}
            {!showingExample && result.attempt_id && (
              <MarkFeedbackPrompt attemptId={result.attempt_id} />
            )}

            {showingExample ? (
              <MarkExampleFooter onDismiss={closeExample} />
            ) : (
              <PostMarkNextSteps
                result={result}
                onMarkAnother={handleMarkAnotherAttempt}
                onMarkNewQuestion={handleMarkNewQuestion}
              />
            )}

            {showFreeNudge && (
              <p className="pt-1 text-center text-sm text-[var(--ec-text-secondary)]">
                Want to mark more?{' '}
                <Link href="/pricing" className="ec-link">
                  See plans →
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
      <CelebrationModal
        open={firstMarkCelebration}
        title="First mark complete!"
        message="That's your first examiner-style review on MarkScheme. Read the breakdown, then try another question when you're ready."
        onDismiss={() => setFirstMarkCelebration(false)}
      />
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        variant={upgradeModal?.variant ?? 'cap'}
        tier={upgradeModal?.tier}
        cap={upgradeModal?.cap}
        periodResetsAt={upgradeModal?.periodResetsAt}
        creditBalance={upgradeModal?.creditBalance}
        returnPath="/mark"
      />
    </main>
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
    <div className="ms-mark-step-label">
      <span className="ms-mark-step-label-num" aria-hidden="true">
        {number}
      </span>
      <div className="ms-mark-step-label-copy">
        <span className="ms-mark-step-label-title">{label}</span>
        {hint ? <span className="ms-mark-step-label-hint">{hint}</span> : null}
      </div>
    </div>
  )
}
