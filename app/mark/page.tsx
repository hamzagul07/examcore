'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { UploadCloud, ChevronRight, Sparkles } from 'lucide-react'
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
import { compressImage } from '@/lib/upload/compress-image'
import {
  hasCompressingPages,
  prepareImageFilesForSubmit,
} from '@/lib/upload/prepare-upload'
import { formatFileSize } from '@/lib/upload/upload-limits'
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
import { PostMarkNextSteps } from '@/components/mark/PostMarkNextSteps'
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
import { isPaidTier, FREE_WHOLE_PAPER_QUESTION_LIMIT } from '@/lib/billing/features'
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
  const submittingRef = useRef(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorRetryable, setErrorRetryable] = useState(false)
  const [firstMarkCelebration, setFirstMarkCelebration] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState | null>(null)
  const [showFreeNudge, setShowFreeNudge] = useState(false)
  const [billingSummary, setBillingSummary] = useState<BillingSummaryClient | null>(null)
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
  const [showManualPaper, setShowManualPaper] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedComponent, setSelectedComponent] = useState('')
  const [questionNumber, setQuestionNumber] = useState('')
  const [uploadMode, setUploadMode] = useState<'single_question' | 'whole_paper'>(
    'single_question'
  )
  const [markIntent, setMarkIntent] = useState<'past_paper' | 'practice_question'>(
    'past_paper'
  )
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
        if (!res.ok || cancelled) return
        setBillingSummary((await res.json()) as BillingSummaryClient)
      } catch {
        if (!cancelled) setBillingSummary(null)
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
    result && !result.whole_paper ? 2 : cinematicActive || loading ? 1 : 0

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
  const hasUnsavedUploads = answerPages.length > 0 && !result
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
      markIntent === 'practice_question'
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

  const ibManualCriteriaSummary =
    isPracticeMode && selectedSubject && isIbSubjectCode(selectedSubject)
      ? ibPracticeCriteriaSummary(selectedSubject)
      : null

  const hasPracticeQuestion =
    questionTextInput.trim().length >= 10 || !!questionPhoto

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
        setMarkIntent('practice_question')
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
    flushSync(() => {
      setLoading(true)
    })

    const releaseSubmit = () => {
      submittingRef.current = false
    }

    try {
      if (answerPages.length === 0) {
        setLoading(false)
        releaseSubmit()
        setErrorMsg('Upload at least one page of your answer.')
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
            'Add your question — type it or upload a photo — before marking.'
          )
          return
        }
      }

      setMarkProgress({ percent: 5, stage: 'reading_work' })
      setMarkContext(null)
      setMarkStreamError(null)
      setErrorMsg('')
      setErrorRetryable(false)
      setResult(null)
      setPendingResult(null)
      pendingResultRef.current = null

      const { pageFiles, extras, error: payloadError } =
        await prepareImageFilesForSubmit(
          answerPages.map((p) => p.file),
          [questionPhoto]
        )
      if (payloadError) {
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        setErrorMsg(payloadError)
        return
      }

      const compressedQuestion = extras[0] ?? null

      const formData = new FormData()
      pageFiles.forEach((file, i) => {
        formData.append(`pages[${i}]`, file)
      })
      if (pageFiles.length === 1) {
        formData.append('photo', pageFiles[0])
      }
      formData.append('upload_mode', uploadMode)
      formData.append('mark_intent', markIntent)
      formData.append('stream', '1')
      if (compressedQuestion) {
        formData.append('question_photo', compressedQuestion)
      }
      if (questionTextInput.trim()) formData.append('question_text', questionTextInput)

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

      const res = await fetch('/api/mark/process', { method: 'POST', body: formData })
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
        const event = parseMarkStreamPart(part)
        if (!event) return false
        const outcome = handleMarkStreamEvent(event, streamCtx)
        if (outcome === 'error') return true
        if (outcome === 'result' && event.payload) {
          finalPayload = event.payload as MarkingResult
        }
        return false
      }

      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>
        try {
          chunk = await reader.read()
        } catch (streamErr) {
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

      if (finalPayload) {
        // Buffer the payload and let the cinematic wait choreograph the reveal.
        // Marking stays "in flight" (loading + markProgress) until onReveal
        // commits the real results — see handleReveal.
        pendingResultRef.current = finalPayload
        setPendingResult(finalPayload)
      } else {
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        setMarkContext(null)
        setMarkStreamError(null)
        setErrorMsg('Marking finished without a result. Your photos are still here.')
        setErrorRetryable(true)
      }
    } catch (err) {
      setLoading(false)
      submittingRef.current = false
      setMarkProgress(null)
      const { message, retryable } = formatClientMarkError(err)
      setMarkStreamError(message)
      setErrorMsg(message)
      setErrorRetryable(retryable)
    }
  }

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
        className={`ms-mark-pg min-w-0 ${result && !result.whole_paper ? '' : 'ms-mark-pg--narrow'}`}
      >
        {!result && (
          <p className="ms-overline" style={{ marginBottom: 6 }}>
            Mark a question
          </p>
        )}
        <MarkStepsBar stage={markStage} />

        {!result && <PageHelpStrip className="mb-6" />}

        {!result && practiceContext && (
          <div
            className="ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0"
          >
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
          <div className="ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0">
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
          <div className="ec-card mb-6 flex items-start gap-3 border-[var(--ec-brand)]/30 ec-bg-brand-muted p-4 min-w-0">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                IB criterion practice — {resolveSubjectLabel(selectedSubject)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                Upload your answer below. We mark band-by-band against the official assessment
                criteria.
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

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <MarkBoardPicker
              value={selectedMarkBoard}
              onChange={handleMarkBoardChange}
              disabled={profileLoading}
            />

            <div className="ms-lvl-tabs-scroll">
            <div
              className="ms-lvl-tabs"
              role="tablist"
              aria-label="Mark mode"
              aria-describedby={selectedMarkBoard === 'ib' ? 'mark-mode-ib-hint' : undefined}
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
            {selectedMarkBoard === 'ib' ? (
              <p
                id="mark-mode-ib-hint"
                className="-mt-4 text-center text-xs leading-relaxed text-[var(--ec-text-secondary)]"
              >
                IB uses <strong className="text-[var(--ec-text-primary)]">My question</strong> — paste
                or photograph your prompt for criterion-band marking. Past-paper lookup is Cambridge
                only.
              </p>
            ) : null}
            {isPracticeMode && (
              <p className="-mt-4 text-center text-xs leading-relaxed text-[var(--ec-text-secondary)]">
                {selectedMarkBoard === 'ib'
                  ? 'Homework, textbook, or course practice — marked band-by-band against IB assessment criteria.'
                  : 'Homework or textbook questions — marked with Cambridge conventions (B1, M1, A1, bands) without needing a past paper in our database.'}
              </p>
            )}

            <p className="text-center text-xs leading-relaxed text-[var(--ec-text-secondary)]">
              Upload a clear photo or PDF of your written or typed answer — we mark it against
              the official scheme in about a minute.{' '}
              <Link href="/tools/command-words" className="ec-link">
                What the command words mean
              </Link>
            </p>

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
                    {billingSummary?.signedIn && !isPaidTier(billingSummary.tier) && (
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
            <div className="ms-upload-grid">
              <div className="ms-mark-upload-zone ec-section-tint ec-section-tint--learn">
                <PageUploader
                  pages={answerPages}
                  onPagesChange={setAnswerPages}
                  disabled={loading}
                  emptyLabel="Drop your working here"
                  emptyHint="photos or camera — multi-page is fine"
                />
              </div>
              <div className="ms-mark-form-card">
                <h3>
                  {isPracticeMode
                    ? 'Your question & subject'
                    : 'Which paper is this?'}
                </h3>
                <div className="space-y-4">
                  {isPracticeMode && (
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

              {isPracticeMode && (
                <div className="space-y-4">
                  {catalogSubject && (
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
                            right number. Leave blank and we&apos;ll read it from the question.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-[var(--ec-text-secondary)]">
                    Paste or photograph the question from your textbook, worksheet, or
                    notes. Add <strong className="text-[var(--ec-text-primary)]">one</strong> —
                    photo <em>or</em> typed text, not both. We need the exact wording to mark
                    your answer accurately.
                  </p>

                  <div>
                    <Label htmlFor="practice-question-photo" className="label-overline mb-2 inline-block">
                      Photo of the question
                    </Label>
                    <label
                      htmlFor="practice-question-photo"
                      className="group block w-full cursor-pointer rounded-2xl border-2 border-dashed ec-border-color ec-bg-surface-raised p-5 text-center text-sm transition-all duration-200 hover:border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] hover:bg-[var(--ec-brand-muted)]"
                    >
                      <UploadCloud className="mx-auto mb-2 h-5 w-5 ec-text-secondary transition-colors group-hover:text-[var(--ec-brand)]" />
                      <div className="font-medium text-[var(--ec-text-primary)]">
                        {questionPhotoCompressing
                          ? 'Preparing image…'
                          : questionPhoto
                            ? `${questionPhoto.name} · ${formatFileSize(questionPhoto.size)}`
                            : 'Click to upload'}
                      </div>
                      <input
                        id="practice-question-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const raw = e.target.files?.[0]
                          if (!raw) {
                            setQuestionPhoto(null)
                            return
                          }
                          setQuestionPhotoCompressing(true)
                          void compressImage(raw)
                            .then((compressed) => setQuestionPhoto(compressed))
                            .finally(() => setQuestionPhotoCompressing(false))
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs font-medium ec-text-secondary">
                    <div className="h-px flex-1 bg-[var(--ec-border)]" />
                    <span>OR</span>
                    <div className="h-px flex-1 bg-[var(--ec-border)]" />
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
              ) : null}

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
                      header, add it here so we can mark more accurately.
                    </p>

                    <div>
                      <Label htmlFor="question-photo" className="label-overline mb-2 inline-block">
                        Photo of the question
                      </Label>
                      <label
                        htmlFor="question-photo"
                        className="group block w-full cursor-pointer rounded-2xl border-2 border-dashed ec-border-color ec-bg-surface-raised p-5 text-center text-sm transition-all duration-200 hover:border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] hover:bg-[var(--ec-brand-muted)]"
                      >
                        <UploadCloud className="mx-auto mb-2 h-5 w-5 ec-text-secondary transition-colors group-hover:text-[var(--ec-brand)]" />
                        <div className="font-medium text-[var(--ec-text-primary)]">
                          {questionPhotoCompressing
                            ? 'Preparing image…'
                            : questionPhoto
                              ? `${questionPhoto.name} · ${formatFileSize(questionPhoto.size)}`
                              : 'Click to upload'}
                        </div>
                        <input
                          id="question-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const raw = e.target.files?.[0]
                            if (!raw) {
                              setQuestionPhoto(null)
                              return
                            }
                            setQuestionPhotoCompressing(true)
                            void compressImage(raw)
                              .then((compressed) => setQuestionPhoto(compressed))
                              .finally(() => setQuestionPhotoCompressing(false))
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs font-medium ec-text-secondary">
                      <div className="h-px flex-1 bg-[var(--ec-border)]" />
                      <span>OR</span>
                      <div className="h-px flex-1 bg-[var(--ec-border)]" />
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
                      !answerPages.length ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing ||
                      submitBlocked ||
                      (isPracticeMode &&
                        (!selectedSubject || !hasPracticeQuestion))
                    }
                    pulse={
                      answerPages.length > 0 &&
                      !loading &&
                      (!isPracticeMode ||
                        (!!selectedSubject && hasPracticeQuestion))
                    }
                    leftIcon={!loading ? <Sparkles className="h-5 w-5" /> : undefined}
                    className="mark-submit-btn justify-center text-base"
                  >
                    {isPracticeMode ? 'Mark my question' : 'Mark my answer →'}
                  </Button>
                  {!isPracticeMode && isManualFilled && (
                    <p className="ms-micro text-center" style={{ marginTop: 10 }}>
                      USES THE OFFICIAL {selectedSubject}/{selectedComponent} MARK SCHEME
                    </p>
                  )}
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
                      !answerPages.length ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing
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
                  !answerPages.length ||
                  hasCompressingPages(answerPages) ||
                  questionPhotoCompressing
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {result && !result.whole_paper && (
          <div className="space-y-8">
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

            <PostMarkNextSteps
              result={result}
              onMarkAnother={handleMarkAnotherAttempt}
              onMarkNewQuestion={handleMarkNewQuestion}
            />

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
    <div className="flex items-center gap-3">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ec-mark-badge--earned font-mono text-xs font-bold">
        {number}
      </span>
      <span className="text-base font-bold tracking-tight text-[var(--ec-text-primary)]">
        {label}
      </span>
      {hint && (
        <span className="font-mono text-xs font-medium text-[var(--ec-text-secondary)]">· {hint}</span>
      )}
    </div>
  )
}
