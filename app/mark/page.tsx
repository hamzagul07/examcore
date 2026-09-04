'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
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
  PostMarkTargetGradeAsk,
  wasTargetGradeAskDismissed,
} from '@/components/mark/PostMarkTargetGradeAsk'
import {
  PostMarkExamDateAsk,
  wasExamDateAskDismissed,
} from '@/components/mark/PostMarkExamDateAsk'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MARK_DURATION_SINGLE } from '@/lib/copy/product-lexicon'
import {
  MarkExampleBanner,
  MarkExampleFooter,
  MarkExampleInvite,
} from '@/components/mark/MarkExample'
import { MarkFeedbackPrompt } from '@/components/mark/MarkFeedbackPrompt'
import { PredictScorePrompt } from '@/components/mark/PredictScorePrompt'
import { RunningElsewhereNotice } from '@/components/mark/RunningElsewhereNotice'
import {
  clearPendingMark,
  noteFinishedMark,
  notePendingMark,
} from '@/lib/marking/pending-mark'
import { LeaveNoticeCard } from '@/components/mark/LeaveNotice'
import { PredictionGap } from '@/components/mark/PredictionGap'
import { ExaminerAdjustmentNote } from '@/components/mark/ExaminerAdjustmentNote'
import { ProvisionalScoreCard } from '@/components/mark/ProvisionalScoreCard'
import { GuestConversionPrompt } from '@/components/mark/GuestConversionPrompt'
import {
  DEMO_MARK_RESULT,
  DEMO_MARK_QUERY_PARAM,
} from '@/lib/marking/demo-result'
import { DEMO_MARK_RESULT_IB } from '@/lib/marking/demo-result-ib'
import { PastPaperSelectorFields } from '@/components/mark/PastPaperSelectorFields'
import {
  MarkBoardPicker,
  boardSupportsPastPaperLookup,
  boardSupportsWholePaper,
  coerceMarkExamBoard,
  isUrlMarkBoard,
  markBoardFromProfileBoard,
  subjectMatchesMarkBoard,
  type MarkExamBoard,
} from '@/components/mark/MarkBoardPicker'
import {
  getEdexcelMarkableUnitCodes,
  resolveEdexcelUnitLabel,
} from '@/lib/edexcel/marking'
import { markableCodesForBoard } from '@/lib/marking/mark-board-subjects'
import { preferSubjectCodesFirst } from '@/lib/subjects/prefer-codes'
import { resolveBoard } from '@/lib/courses/board'
import { MarkingModeHint } from '@/components/mark/MarkingModeHint'
import {
  SOFT_MARK_RETRY_NOTICE,
  SOFT_TOTAL_MARKS_NOTICE,
  isTotalMarksClientMessage,
  softNoticeForMarkFailure,
} from '@/lib/marking/soft-mark-notice'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import {
  MARK_HANDOFF_PARAM,
  MARK_HANDOFF_VALUE,
  splitSubjectLevel,
  subjectCandidates,
  takeHandoff,
} from '@/lib/courses/mark-handoff'
import { parseMarkReturnPath } from '@/lib/marking/mark-return-url'
import { takePracticeAnswer } from '@/lib/marking/practice-answer'
import {
  questionTotalPromiseIsBroken,
  QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE,
} from '@/lib/marking/require-question-total'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { applyTopicQuestionToPaperSelection } from '@/lib/marking/topic-question'
import { StarterQuestionInvite } from '@/components/mark/StarterQuestionInvite'
import { CinematicMarkingExperience } from '@/components/mark/CinematicMarkingExperienceLazy'
import { MarkingWaitOverlay } from '@/components/mark/MarkingWaitOverlay'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { CelebrationModal } from '@/components/ui/CelebrationModal'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { PostMarkPremiumCard } from '@/components/billing/PostMarkPremiumCard'
import {
  rememberFunnelBoard,
  trackAnswerInputStarted,
  trackFunnelEvent,
} from '@/lib/analytics/funnel'
import { BillingLimitBanner } from '@/components/billing/BillingLimitBanner'
import { GuestMarkNotice } from '@/components/billing/GuestMarkNotice'
import { MarkUsageIndicator } from '@/components/billing/MarkUsageIndicator'
import { capForTier } from '@/lib/billing/caps'
import { FREE_WHOLE_PAPER_QUESTION_LIMIT, hasPaidAccess, isMax } from '@/lib/billing/features'
import { MaxBadge } from '@/components/max/MaxBadge'
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
import {
  MarkFlow,
  type MarkFlowHandle,
} from '@/components/mark-flow/MarkFlow'
import {
  MarkingScreen,
  MarkingScreenHeader,
} from '@/components/mark-flow/screens/MarkingScreen'
import { ResultScreen } from '@/components/mark-flow/screens/ResultScreen'
import {
  parsePaperCode,
  parsePaperSession,
} from '@/components/mark-flow/parse-paper-meta'
import type { AvailablePapersMap } from '@/components/mark-flow/MarkFlowPastPaperPicker'
import { isMarkFlowV2Enabled } from '@/lib/marking/mark-flow-flag'

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
  /** What the student predicted during the wait, echoed back so a reload of the
   * result still shows the gap. */
  predicted_marks?: number | null
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
  // The answer typed rather than photographed. The marker has always been
  // text-in — vision only ever existed to produce these words — but every path
  // through this page demanded a photo, which locks out anyone working at a
  // keyboard rather than over a page of handwriting.
  const [answerTextInput, setAnswerTextInput] = useState('')
  // Set when the student arrived from a lesson with an answer already written.
  const [lessonHandoff, setLessonHandoff] = useState<{ returnTo: string | null } | null>(null)
  const [pendingHandoffSubject, setPendingHandoffSubject] = useState<
    { codes: string[]; level: 'HL' | 'SL' | null; board: MarkExamBoard } | null
  >(null)
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
  /** Telemetry row for the in-flight mark. Arrives first on the stream and is
   * what the wait-time score prediction is filed against. */
  const [markRunId, setMarkRunId] = useState<string | null>(null)
  /** What the student predicted this run, held so the reveal can show the gap
   * without waiting on a round trip. */
  const [predictedMarks, setPredictedMarks] = useState<number | null>(null)
  /**
   * Whether this page is still on screen.
   *
   * The marking request outlives the component: navigating away does not abort
   * it, so its handler keeps running with no UI attached. This ref is how that
   * handler tells "the student is watching this land" from "the student left
   * and needs to be told some other way".
   */
  const markPageMountedRef = useRef(true)
  /** Run id of the mark in flight, readable from the detached stream handler. */
  const currentMarkRunIdRef = useRef<string | null>(null)
  useEffect(() => {
    markPageMountedRef.current = true
    return () => {
      markPageMountedRef.current = false
    }
  }, [])

  /** Skip pressed on the prediction prompt. Held here, not in the prompt, so
   * one place decides whether the leave notice needs its own card. */
  const [predictionDismissed, setPredictionDismissed] = useState(false)
  /** First-pass marks, in ahead of the verify pass. Shown as provisional. */
  const [provisionalScore, setProvisionalScore] = useState<{
    marksEarned: number
    totalMarks: number
  } | null>(null)
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
  const markFlowRef = useRef<MarkFlowHandle | null>(null)
  // The stream now outlives the reveal — it stays open while the premium
  // rewrite generates — so a second mark can legitimately start while the first
  // is still draining. Every state write originating from a stream is tagged
  // with the run that produced it, and the previous request is aborted on
  // submit; otherwise mark #1's late error or late rewrite lands on mark #2.
  const markRunSeqRef = useRef(0)
  const markAbortRef = useRef<AbortController | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorRetryable, setErrorRetryable] = useState(false)
  /** Calm recovery after an unfinished mark — not framed as an error alert. */
  const [softMarkNotice, setSoftMarkNotice] = useState<string | null>(null)
  const [firstMarkCelebration, setFirstMarkCelebration] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState | null>(null)
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
  /** Whole-paper pages live inside WholePaperFlow — track dirty for beforeunload (MK-03). */
  const [wholePaperUnsaved, setWholePaperUnsaved] = useState(false)
  const [profileSubjectCodes, setProfileSubjectCodes] = useState<string[]>([])
  const [, setProfileLevel] = useState('A-Level')
  const [profileBoard, setProfileBoard] = useState('Cambridge International')
  /** undefined = not loaded yet; null = signed-in with no target. */
  const [targetGrade, setTargetGrade] = useState<string | null | undefined>(undefined)
  const [gradeAskDismissed, setGradeAskDismissed] = useState(false)
  /** undefined = not loaded yet; null = signed-in with no exam date. */
  const [examDate, setExamDate] = useState<string | null | undefined>(undefined)
  const [examDateAskDismissed, setExamDateAskDismissed] = useState(false)
  const [selectedMarkBoard, setSelectedMarkBoard] = useState<MarkExamBoard>('cambridge')
  const [profileLoading, setProfileLoading] = useState(true)
  /** R1 MarkFlow v2 — Capture/Confirm shell (`?flow=v2` or localStorage). */
  const [markFlowV2, setMarkFlowV2] = useState(false)
  const [v2SubmitTick, setV2SubmitTick] = useState(0)
  /** Whole-paper seed after Confirm — pages already captured in MarkFlow. */
  const [v2WholePaperSeed, setV2WholePaperSeed] = useState<{
    pages: UploadPage[]
    pdf: File | null
    paperCode: string
    paperSession: string
  } | null>(null)
  /** Keep WholePaperFlow mounted; only swap Marking/Result chrome (R1). */
  const [v2WpPhase, setV2WpPhase] = useState<'upload' | 'marking' | 'result'>(
    'marking'
  )
  /** True from Confirm→submit until cancel/result — keeps wait shell open before `loading`. */
  const [v2OneAnswerMarking, setV2OneAnswerMarking] = useState(false)

  useEffect(() => {
    setGradeAskDismissed(wasTargetGradeAskDismissed())
    setExamDateAskDismissed(wasExamDateAskDismissed())
    setMarkFlowV2(isMarkFlowV2Enabled())
  }, [])

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
    const waitOpen = cinematicActive || !!markStreamError
    if (!waitOpen || typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [cinematicActive, markStreamError])

  /**
   * A single-question mark already in flight for a signed-in student is no
   * longer at risk: the server finishes it whether or not the tab is open, and
   * emails the result. Warning them here would contradict the wait screen,
   * which is now telling them to go and do something else.
   *
   * Whole-paper uploads are excluded — those still live in the browser until
   * their own flow submits them.
   */
  const markSurvivesLeaving =
    cinematicActive && !!billingSummary?.signedIn && !wholePaperUnsaved

  // Uploaded photos only live in memory — warn before a refresh/close discards
  // them. Includes whole-paper uploads held in WholePaperFlow (MK-03).
  // Skipped once results are in (nothing left to lose).
  const hasUnsavedUploads =
    (answerPages.length > 0 || !!answerPdf || wholePaperUnsaved) &&
    !result &&
    !markSurvivesLeaving
  useEffect(() => {
    if (!hasUnsavedUploads || typeof window === 'undefined') return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedUploads])

  // Deep-link: /mark?board=edexcel|ib|cambridge — wins for guests immediately;
  // signed-in profile load below respects the same URL override.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlBoard = new URLSearchParams(window.location.search)
      .get('board')
      ?.trim()
      .toLowerCase()
    if (!isUrlMarkBoard(urlBoard)) return
    setSelectedMarkBoard(urlBoard)
    rememberFunnelBoard(urlBoard)
    if (!boardSupportsPastPaperLookup(urlBoard)) {
      setUploadMode('single_question')
      setMarkIntent('practice_question')
      setShowManualPaper(false)
    }
  }, [])

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
          .select('subjects, level, board, target_grade, exam_date')
          .eq('id', user.id)
          .maybeSingle()
        const profileLevel = profile?.level ?? 'A-Level'
        const boardName = profile?.board ?? 'Cambridge International'
        const subjectNames: string[] = profile?.subjects?.length
          ? profile.subjects
          : defaultSubjectsForProfile(boardName, profileLevel)
        const codes = subjectNames
          .map((name) => getSubjectById(name, profileLevel)?.code)
          .filter((c): c is string => !!c)
        const urlBoard = new URLSearchParams(window.location.search)
          .get('board')
          ?.trim()
          .toLowerCase()
        const fromUrl: MarkExamBoard | null = isUrlMarkBoard(urlBoard) ? urlBoard : null
        const markBoard = fromUrl ?? markBoardFromProfileBoard(boardName)
        const fallbackCode = defaultMarkSubjectCode(profileLevel, boardName)
        if (!cancelled) {
          setProfileLevel(profileLevel)
          setProfileBoard(boardName)
          setTargetGrade(
            typeof profile?.target_grade === 'string' && profile.target_grade.trim()
              ? profile.target_grade.trim()
              : null
          )
          setExamDate(
            typeof profile?.exam_date === 'string' &&
              /^\d{4}-\d{2}-\d{2}$/.test(profile.exam_date)
              ? profile.exam_date
              : null
          )
          setProfileSubjectCodes(codes.length ? codes : [fallbackCode])
          setSelectedMarkBoard(markBoard)
          rememberFunnelBoard(markBoard)
          if (!boardSupportsPastPaperLookup(markBoard)) {
            setUploadMode('single_question')
            setMarkIntent('practice_question')
            setShowManualPaper(false)
          }
        }
      } catch {
        if (!cancelled) {
          setProfileSubjectCodes([defaultMarkSubjectCode('A-Level')])
          setTargetGrade(null)
          setExamDate(null)
        }
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
    // An explicit URL selection (a deep-link from a content or course page) is
    // authoritative — don't let the restored last-selection overwrite it. This
    // effect re-runs when selectedMarkBoard changes, so without this guard it
    // could clobber a subject just set by the deep-link handlers below.
    const spGuard = new URLSearchParams(window.location.search)
    if (spGuard.get('subject') || spGuard.get('practice') === '1' || spGuard.get('topic')) {
      return
    }
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
      if (hasAny && boardSupportsPastPaperLookup(selectedMarkBoard)) {
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

  // An answer written somewhere else on the site, carried in sessionStorage.
  //
  // One effect rather than one per link shape. The three surfaces that offer a
  // box — the Cambridge topic pages (?practice=1&paper=…), the IB topic pages
  // (?subject=&topic=) and the IB subject pages (?subject= alone) — all land on
  // a different branch below, and duplicating the read in each of them meant
  // the newest surface silently dropped the answer the student had just typed.
  //
  // Declared first so it wins the race, and read once: reloading /mark, or
  // coming back to it later, must not refill the box with an answer already
  // dealt with.
  //
  // Skipped for a lesson quick check, which carries its own question AND answer
  // under a different key; a leftover practice answer must not overwrite it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get(MARK_HANDOFF_PARAM) === MARK_HANDOFF_VALUE) return
    const carriedAnswer = takePracticeAnswer()
    if (carriedAnswer) setAnswerTextInput(carriedAnswer)
  }, [])

  // "Drill this" deep-link from the insights dashboard. Preloads the exact
  // recommended question (which always exists in mark_schemes) and shows a
  // practice banner. Declared after the localStorage effects so it wins.
  // Loads a banked past-paper question so the student only submits an answer.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('practice') !== '1') return
    const paper = sp.get('paper') || ''
    const sessionRaw = sp.get('session') || ''
    const q = sp.get('q') || sp.get('question') || ''
    const [subjectCode, componentCode] = paper.split('/')
    if (subjectCode) {
      setSelectedSubject(subjectCode)
      setSelectedMarkBoard(coerceMarkExamBoard(resolveBoard(subjectCode)))
    }
    if (componentCode) setSelectedComponent(componentCode)
    const normalized = normalizePaperSession(sessionRaw)
    if (normalized.season) setSelectedSession(normalized.season)
    if (normalized.year != null) setSelectedYear(normalized.year)
    if (q) setQuestionNumber(q)
    setUploadMode('single_question')
    setMarkIntent('past_paper')
    setShowManualPaper(true)
    setShowOptional(true)
    // The carried answer is read by its own effect above, which covers every
    // link shape rather than just this one.
    //
    // The topic page knows the question's total. "We could not read the total
    // marks from your question" is the commonest recorded mark failure, and it
    // fires only AFTER the student has waited — so take the number when it is
    // offered. Ignored downstream when the banked scheme supplies its own.
    const carriedMarks = Number(sp.get('marks'))
    if (Number.isFinite(carriedMarks) && carriedMarks > 0 && carriedMarks <= 100) {
      setTotalMarksInput(String(Math.round(carriedMarks)))
    }
    setPracticeContext({
      pattern: sp.get('pattern') || 'this pattern',
      reason: sp.get('reason') || '',
      returnTo: sp.get('return'),
    })
  }, [])

  // Handoff from a lesson quick check — /mark?from=lesson, with the question
  // and the student's own words in sessionStorage.
  //
  // Read once and cleared, so returning to /mark later does not refill the form
  // with an answer they have already dealt with. Runs before the topic deep
  // link below and bails out of it, since the two would fight over the subject.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get(MARK_HANDOFF_PARAM) !== MARK_HANDOFF_VALUE) return
    const handoff = takeHandoff()
    if (!handoff) return

    setUploadMode('single_question')
    setMarkIntent('practice_question')
    setQuestionTextInput(handoff.question)
    setAnswerTextInput(handoff.answer)
    if (handoff.totalMarks) setTotalMarksInput(String(handoff.totalMarks))
    // The subject cannot be applied yet: the IB catalog that populates the
    // picker is fetched, so at mount there is nothing to select into. Setting
    // it anyway leaves the <select> blank while React state holds a value,
    // which enables submit against a subject that was never really chosen —
    // the student waits ninety seconds for a failure. Hand it to the effect
    // below, which waits for the options to exist.
    if (handoff.subjectCode) {
      const markBoard = coerceMarkExamBoard(resolveBoard(handoff.subjectCode))
      setSelectedMarkBoard(markBoard)
      setPendingHandoffSubject({
        codes: subjectCandidates(handoff.subjectCode),
        level: handoff.ibLevel ?? splitSubjectLevel(handoff.subjectCode).ibLevel,
        board: markBoard,
      })
    }
    setShowOptional(true)
    setLessonHandoff({ returnTo: handoff.returnPath ?? null })
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
    {
      const markBoard = coerceMarkExamBoard(resolveBoard(subject))
      setSelectedMarkBoard(markBoard)
      if (!boardSupportsPastPaperLookup(markBoard)) {
        setMarkIntent('practice_question')
        setShowManualPaper(false)
      }
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

  // Subject deep-link from content pages — /mark?subject=<code>[&session=<s>].
  // Blog CTAs (BlogPostCta) and past-paper pages emit this, but no effect read a
  // bare `subject`, so a reader who clicked "Mark 9701 now" landed on a blank
  // page and had to re-select their subject — friction at the point of intent.
  // Declared last so it wins over the localStorage restore. The practice and
  // subject+topic deep-links have their own effects above; skip when they apply.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('practice') === '1' || sp.get('topic')) return
    const subject = sp.get('subject')?.trim()
    if (!subject) return
    setSelectedSubject(subject)
    const markBoard = coerceMarkExamBoard(resolveBoard(subject))
    setSelectedMarkBoard(markBoard)
    if (!boardSupportsPastPaperLookup(markBoard)) {
      setUploadMode('single_question')
      setMarkIntent('practice_question')
      setShowManualPaper(false)
    } else {
      setMarkIntent('past_paper')
      setShowManualPaper(true)
      const session = sp.get('session')?.trim()
      const m = session?.match(/^(.*)\s+(\d{4})$/)
      if (m) {
        setSelectedSession(m[1])
        setSelectedYear(Number(m[2]))
      }
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
  // Profile subjects are pinned to the top so the student's own courses are one tap away.
  const ibSubjectOptions = useMemo(() => {
    if (selectedMarkBoard !== 'ib') return boardFilteredSubjects
    const catalogCodes = ibCatalog.map((s) => s.code)
    const superseded = new Set(catalogCodes)
    const legacy = boardFilteredSubjects.filter(
      (code) => !superseded.has(code.replace(/-(hl|sl)$/i, ''))
    )
    return preferSubjectCodesFirst(
      [...catalogCodes, ...legacy],
      profileSubjectCodes
    )
  }, [
    selectedMarkBoard,
    boardFilteredSubjects,
    ibCatalog,
    profileSubjectCodes,
  ])

  // Catalog boards: units/content codes from board adapters (not CAIE profile SUBJECTS).
  // Prefer the student's chosen units first, then the rest of the board catalog.
  const catalogBoardSubjectOptions = useMemo(() => {
    const codes = markableCodesForBoard(selectedMarkBoard)
    if (!codes) return boardFilteredSubjects
    return preferSubjectCodesFirst(codes, profileSubjectCodes)
  }, [selectedMarkBoard, boardFilteredSubjects, profileSubjectCodes])

  const markSubjectOptions = useMemo(() => {
    if (selectedMarkBoard === 'ib') return ibSubjectOptions
    if (markableCodesForBoard(selectedMarkBoard)) return catalogBoardSubjectOptions
    return boardFilteredSubjects
  }, [selectedMarkBoard, ibSubjectOptions, catalogBoardSubjectOptions, boardFilteredSubjects])

  // They arrived to mark this specific answer, so put it on screen —
  // otherwise "your answer from the lesson is below" is a claim the student has
  // to scroll a screen and a half to verify.
  //
  // An effect keyed on the handoff, NOT a pair of requestAnimationFrames from
  // the effect that reads it. Locally the frames were slower than hydration and
  // the element existed by the time they ran; in production they fired first,
  // found nothing, and never retried — the scroll silently did not happen. An
  // effect cannot lose that race: it runs after the commit that renders the box.
  useEffect(() => {
    if (!lessonHandoff) return
    const el = document.getElementById('answer-text')
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [lessonHandoff])

  // Apply the handed-off subject once the picker actually has it. Dropped
  // rather than forced if it never appears — a blank picker with an honestly
  // disabled button beats a subject the student cannot see or change.
  useEffect(() => {
    if (!pendingHandoffSubject) return
    // Wait for the board switch to land. setSelectedMarkBoard is queued in the
    // same commit that queues this, so the first run still sees the previous
    // board — and its option list, which will never contain an IB subject.
    // Clearing on that run threw the handoff away before it had a chance.
    if (selectedMarkBoard !== pendingHandoffSubject.board) return
    // "Options are non-empty" is NOT the same as "the catalog has arrived":
    // until the fetch lands, ibSubjectOptions falls back to the profile's own
    // subject list, which is full and contains no catalog codes. Acting on it
    // discarded the handoff every time. Wait for the catalog itself.
    if (selectedMarkBoard === 'ib' && ibCatalog.length === 0) return
    const options = markSubjectOptions
    if (!options.length) return
    const match = pendingHandoffSubject.codes.find((c) => options.includes(c))
    if (match) {
      setSelectedSubject(match)
      if (pendingHandoffSubject.level) setIbLevel(pendingHandoffSubject.level)
    }
    setPendingHandoffSubject(null)
  }, [
    pendingHandoffSubject,
    selectedMarkBoard,
    markSubjectOptions,
    ibCatalog,
  ])

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
    if (boardSupportsPastPaperLookup(selectedMarkBoard)) return
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
    const pool =
      selectedMarkBoard === 'ib'
        ? ibSubjectOptions
        : markableCodesForBoard(selectedMarkBoard)
          ? catalogBoardSubjectOptions
          : boardFilteredSubjects.length
            ? boardFilteredSubjects
            : profileSelectableSubjects
    // Prefer the first profile subject that appears in this board's pool.
    // Fall back to a board default only when the profile has no match yet.
    const fromProfile = profileSubjectCodes.find((c) => pool.includes(c))
    const preferred =
      fromProfile ??
      (selectedMarkBoard === 'ib'
        ? pool[0]
        : selectedMarkBoard === 'edexcel'
          ? pool.find((c) => c === 'WMA11') ?? pool[0]
          : pool.find((c) => c === '9709') ?? pool[0])
    if (preferred) {
      setSelectedSubject(preferred)
      if (boardSupportsPastPaperLookup(selectedMarkBoard)) {
        setShowManualPaper(true)
      }
    }
  }, [
    profileLoading,
    papersLoading,
    selectedSubject,
    boardFilteredSubjects,
    catalogBoardSubjectOptions,
    ibSubjectOptions,
    profileSelectableSubjects,
    profileSubjectCodes,
    markIntent,
    selectedMarkBoard,
  ])

  const isPracticeMode =
    uploadMode === 'single_question' && markIntent === 'practice_question'
  const isCombinedMode =
    uploadMode === 'single_question' && markIntent === 'combined_script'
  const MIN_TYPED_ANSWER = 12
  const hasTypedAnswer = answerTextInput.trim().length >= MIN_TYPED_ANSWER
  const hasAnswerUpload = answerPages.length > 0 || !!answerPdf
  /** An answer is an answer whether it was photographed or typed. */
  const hasAnswer = hasAnswerUpload || hasTypedAnswer

  /**
   * Nothing brought, nothing chosen — the state 1,207 of 1,300 /mark sessions
   * were in last month when they left without typing a character.
   *
   * Narrow on purpose: the moment anything is typed, uploaded or selected, the
   * student has their own work in hand and an offer of someone else's question
   * would be in the way.
   */
  const formIsEmpty =
    !hasAnswer &&
    !questionPhoto &&
    !questionTextInput.trim() &&
    !questionNumber.trim() &&
    !isCombinedMode

  /** Load a real banked question into the form, exactly as a topic deep link does. */
  function applyStarterQuestion(q: {
    paper_code: string
    paper_session: string
    question_number: string
    question_text: string
    total_marks: number
  }) {
    const selection = applyTopicQuestionToPaperSelection({
      paper_code: q.paper_code,
      paper_session: q.paper_session,
      question_number: q.question_number,
    })
    if (!selection) return
    setUploadMode('single_question')
    setMarkIntent('past_paper')
    setSelectedSubject(selection.subject)
    setSelectedMarkBoard(coerceMarkExamBoard(resolveBoard(selection.subject)))
    setSelectedComponent(selection.component)
    setSelectedSession(selection.session)
    setSelectedYear(selection.year)
    setQuestionNumber(selection.questionNumber)
    setQuestionTextInput(q.question_text)
    setTotalMarksInput(String(q.total_marks))
    setMarksInQuestion(false)
    setShowManualPaper(true)
    setShowOptional(true)
  }

  const markModeCallout = useMemo(() => {
    if (uploadMode === 'whole_paper') {
      return 'Upload your full answer paper — we segment and mark each question against the official scheme.'
    }
    if (isCombinedMode) {
      if (selectedMarkBoard === 'ib') {
        return 'One PDF or photo with the IB question and your answer together. We split them and mark band-by-band.'
      }
      if (selectedMarkBoard === 'edexcel') {
        return 'One scan with the IAL question and your working together — we split them and mark with Edexcel M/A conventions.'
      }
      return 'One scan with question and answer together — worksheets, homework sheets, or textbook pages.'
    }
    if (isPracticeMode) {
      if (selectedMarkBoard === 'ib') {
        return 'Homework or textbook practice — add the question as text or a photo, then your answer.'
      }
      if (selectedMarkBoard === 'edexcel') {
        return 'IAL homework or textbook questions — photos or PDFs, marked with Edexcel method/accuracy conventions.'
      }
      if (selectedMarkBoard === 'oxfordaqa') {
        return 'Homework or textbook questions — photos or PDFs, marked with OxfordAQA point/method conventions.'
      }
      if (selectedMarkBoard === 'aqa') {
        return 'Homework or textbook questions — photos or PDFs, marked with AQA method/accuracy conventions.'
      }
      if (selectedMarkBoard === 'ap') {
        return 'Homework or textbook FRQs — photos or PDFs, marked with AP earned-point conventions.'
      }
      return 'Homework or textbook questions — photos or PDFs, marked with Cambridge conventions.'
    }
    if (selectedMarkBoard === 'ib') {
      return 'One answer: choose how the question is provided below. Past-paper lookup is Cambridge-only for now.'
    }
    if (selectedMarkBoard === 'edexcel') {
      return 'One answer: choose how the question is provided below. Past-paper lookup stays Cambridge-only for now.'
    }
    if (
      selectedMarkBoard === 'oxfordaqa' ||
      selectedMarkBoard === 'aqa' ||
      selectedMarkBoard === 'ap'
    ) {
      return 'One answer: choose how the question is provided below. Past-paper lookup is Cambridge-only for now.'
    }
    return 'One answer from a past paper or your own question — tick the box if both are on the same page.'
  }, [uploadMode, isCombinedMode, isPracticeMode, selectedMarkBoard])

  const markLearnMoreHref =
    selectedMarkBoard === 'ib'
      ? '/blog/ib-markbands-explained'
      : selectedMarkBoard === 'edexcel'
        ? '/edexcel/international-a-level/mathematics'
        : '/tools/command-words'
  const markLearnMoreLabel =
    selectedMarkBoard === 'ib'
      ? 'How IB markbands work'
      : selectedMarkBoard === 'edexcel'
        ? 'Edexcel IAL Maths units'
        : 'What the command words mean'

  const ibManualCriteriaSummary =
    (isPracticeMode || isCombinedMode) &&
    selectedSubject &&
    isIbSubjectCode(selectedSubject)
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

  /**
   * A typed answer needs the question to come from somewhere else.
   *
   * With a photo we can read the printed question off the same page, and the
   * pipeline deliberately does — that is what makes "just upload it" work.
   * Text has no margins: somebody who types only their answer leaves nothing
   * to recover a question from, so the run dies after two model calls with
   * "we couldn't find a question in your upload". Better to say so before they
   * spend the wait. Practice mode already demands a question of its own.
   */
  const typedAnswerNeedsQuestion =
    hasTypedAnswer &&
    !hasAnswerUpload &&
    !isPracticeMode &&
    !isCombinedMode &&
    !questionTextInput.trim() &&
    !questionPhoto &&
    !isManualFilled

  // The tailored IB "Marks available" input already covers points-based IB
  // components — don't show a second marks field on top of it.
  const ibPointsMarksShown =
    (isPracticeMode || isCombinedMode) &&
    !!catalogSubject &&
    !!ibComponentKey &&
    selectedCatalogComponent?.assessment_model === 'points'
  // Show a per-question "total marks" control whenever no banked scheme total
  // is available (including paper selected but missing from the DB). Hidden
  // only when the official scheme is confirmed in-DB or IB points already cover it.
  const hasBankedSchemeTotal = isManualFilled && schemeInDb === true
  const showTotalMarksField =
    uploadMode === 'single_question' &&
    !hasBankedSchemeTotal &&
    !ibPointsMarksShown
  const parsedTotalMarksInput = (() => {
    const n = Number(totalMarksInput.trim())
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.round(n) : null
  })()
  // "The marks are shown in the question" is a promise, and whenever the
  // question is text in this form it is checkable right here — by the same
  // deterministic extractor the server runs at the gate.
  //
  // Of 23 recorded marking failures, 13 were a missing total, and 12 of those
  // 13 had this box ticked against a question with no marks written in it. The
  // wait before being told ran from 2 seconds to 184. None of that round trip
  // was ever necessary for a typed question.
  //
  // Deliberately computed WITHOUT the typed total. It decides whether the
  // number field is on screen, and a visibility condition that depends on the
  // value inside the field unmounts it on the first digit — the student types
  // "1" of "18" and the input disappears under them.
  //
  // An answer upload is always a way out: the practice path mines the answer
  // transcript for a question, and the upload-only past-paper path transcribes
  // the printed stem alongside the working. Either can still turn up the number.
  const marksPromiseUnkeepable =
    showTotalMarksField &&
    questionTotalPromiseIsBroken({
      marksInQuestion,
      questionText: questionTextInput,
      hasQuestionImage: !!questionPhoto,
      mayRecoverQuestionFromUpload: hasAnswerUpload,
      questionMarks: null,
      hasSchemeTotal: hasBankedSchemeTotal,
    })
  // Blocking stops the moment they supply the number the message asked for.
  const marksPromiseBroken =
    marksPromiseUnkeepable && parsedTotalMarksInput === null
  const totalMarksSatisfied =
    !showTotalMarksField ||
    parsedTotalMarksInput !== null ||
    (marksInQuestion && !marksPromiseUnkeepable)

  // Why the submit button is disabled, in words — shown under the button so a
  // greyed-out CTA never leaves the user guessing.
  const submitDisabledReason = !hasAnswer
    ? 'Type your answer above, or add a photo or PDF of it.'
    : typedAnswerNeedsQuestion
      ? 'Add the question too — type it, photograph it, or pick the paper. A typed answer has no page for us to read it from.'
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
                : marksPromiseBroken
                  ? QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE
                  : !totalMarksSatisfied
                    ? 'Enter the total marks for this question, or tick that they are shown in the question.'
                    : null

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
    rememberFunnelBoard(next)
    if (selectedSubject && !subjectMatchesMarkBoard(selectedSubject, next)) {
      setSelectedSubject('')
      setSelectedYear('')
      setSelectedSession('')
      setSelectedComponent('')
    }
    if (!boardSupportsPastPaperLookup(next)) {
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
      const nextBoard = coerceMarkExamBoard(resolveBoard(value))
      if (nextBoard !== selectedMarkBoard) {
        setSelectedMarkBoard(nextBoard)
        if (!boardSupportsPastPaperLookup(nextBoard)) {
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
      if (!hasAnswer) {
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

      if (showTotalMarksField && !marksInQuestion) {
        const n = Number(totalMarksInput.trim())
        if (!Number.isFinite(n) || n <= 0 || n > 100) {
          setLoading(false)
          releaseSubmit()
          setSoftMarkNotice(SOFT_TOTAL_MARKS_NOTICE)
          return
        }
      }

      setMarkProgress({ percent: 5, stage: 'reading_work' })
      setMarkContext(null)
      // A new run gets a new prediction; carrying the last one over would show
      // a gap against an answer the student never predicted.
      setMarkRunId(null)
      setPredictedMarks(null)
      setPredictionDismissed(false)
      setProvisionalScore(null)
      setMarkStreamError(null)
      setErrorMsg('')
      setErrorRetryable(false)
      setSoftMarkNotice(null)
      setResult(null)
      setShowingExample(false)
      setPendingResult(null)
      pendingResultRef.current = null
      trackFunnelEvent('answer_submitted', {
        subject: selectedSubject || null,
        source: uploadMode,
        board: selectedMarkBoard,
      })

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
      formData.append('exam_system', selectedMarkBoard)
      formData.append('stream', '1')
      // Always forward the chosen subject, even without a full paper selection,
      // so freeform marks get syllabus-tagged and feed mastery/review.
      if (selectedSubject) formData.append('subject_code', selectedSubject)
      if (questionFile) {
        formData.append('question_photo', questionFile)
      }
      if (questionTextInput.trim()) formData.append('question_text', questionTextInput)
      // Only when there is nothing uploaded: a photo is richer than typing and
      // sending both would leave the pipeline choosing between two answers.
      if (!hasAnswerUpload && hasTypedAnswer) {
        formData.append('answer_text', answerTextInput.trim())
      }

      // Per-question total marks: send the user-entered denominator unless they
      // ticked "the marks are shown in my question" (then the marker reads it
      // from the question image/text and rejects if nothing is stated). The
      // backend still prefers an official mark-scheme total over this when one
      // is available.
      if (showTotalMarksField) {
        // The typed number wins whenever there is one. It used to be dropped
        // whenever the box was ticked, so a student who ticked "the marks are
        // in my question", was told the marks were not in it, and typed the
        // total as instructed still sent nothing — and got the same error
        // back, with no way out but unticking a box nobody told them about.
        if (parsedTotalMarksInput !== null) {
          formData.append('total_marks_available', String(parsedTotalMarksInput))
        }
        if (marksInQuestion) {
          formData.append('marks_in_question', '1')
        }
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
            cap: data.cap ?? capForTier(tier),
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
        setLoading(false)
        releaseSubmit()
        setMarkProgress(null)
        setMarkStreamError(null)
        setErrorMsg('')
        showMarkFailure(
          data.error ||
            'Marking failed — please try again. If it keeps happening, re-upload a clearer photo or PDF.'
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalPayload: MarkingResult | null = null
      const streamCtx = {
        setMarkRunId: ((value) => {
          setMarkRunId(value)
          // Filed the moment the run exists, not when the student leaves —
          // there is no event for "about to navigate away" we can trust.
          //
          // Signed-in only, for the same reason the leave notice is: a guest's
          // result page redirects to sign-in, so announcing their finished mark
          // would walk them into a login wall that did not exist when they
          // started. Guests are told nothing and asked to stay.
          if (typeof value === 'string' && billingSummary?.signedIn) {
            currentMarkRunIdRef.current = value
            notePendingMark({ markRunId: value, startedAt: Date.now() })
          }
        }) as typeof setMarkRunId,
        setProvisionalScore,
        setMarkProgress,
        setMarkContext,
        setMarkStreamError,
        setErrorMsg,
        setErrorRetryable,
        setLoading,
        questionNumber,
        onSoftMarkFailure: (serverMessage: string) => {
          showMarkFailure(serverMessage)
        },
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
        // Whether the student is still on this page decides who tells them.
        //
        // Navigating away in the app does not abort the request — the browser
        // holds the connection open, so the server sees a live client and never
        // emails. That leaves this handler, running inside an unmounted
        // component, as the only thing that knows the mark landed. Clearing the
        // pending record here (as it first did) threw that away and the student
        // was told by nobody at all.
        if (outcome === 'error') {
          if (markPageMountedRef.current) clearPendingMark()
          else if (currentMarkRunIdRef.current) {
            noteFinishedMark({
              markRunId: currentMarkRunIdRef.current,
              attemptId: null,
              marksEarned: null,
              totalMarks: null,
              ok: false,
            })
          }
          return true
        }
        if (outcome === 'result' && event.payload) {
          const landed = event.payload as MarkingResult
          if (markPageMountedRef.current) {
            clearPendingMark()
          } else if (currentMarkRunIdRef.current) {
            noteFinishedMark({
              markRunId: currentMarkRunIdRef.current,
              attemptId: landed.attempt_id ?? null,
              marksEarned: landed.marks_earned ?? null,
              totalMarks: landed.total_marks ?? null,
              ok: true,
            })
          }
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
          setLoading(false)
          releaseSubmit()
          setMarkProgress(null)
          setMarkStreamError(null)
          setErrorMsg('')
          setSoftMarkNotice(SOFT_MARK_RETRY_NOTICE)
          console.warn('[mark] stream failed before result', streamErr)
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
        setErrorMsg('')
        setSoftMarkNotice(SOFT_MARK_RETRY_NOTICE)
      }
    } catch (err) {
      // An abort means a newer mark took over (or the page tore down) — the
      // user is already looking at that run, so surfacing this would be a lie.
      if (!isCurrentRun() || abortController.signal.aborted) return
      setLoading(false)
      submittingRef.current = false
      setMarkProgress(null)
      console.warn('[mark] mark request failed', err)
      setMarkStreamError(null)
      setErrorMsg('')
      setErrorRetryable(false)
      setSoftMarkNotice(SOFT_MARK_RETRY_NOTICE)
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
    const urlBoard =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('board')?.trim().toLowerCase()
        : null
    // Prefer ?board= so IB deep links win before profile state catches up.
    const board: MarkExamBoard = isUrlMarkBoard(urlBoard)
      ? urlBoard
      : selectedMarkBoard
    const fixture = board === 'ib' ? DEMO_MARK_RESULT_IB : DEMO_MARK_RESULT
    // Whether showing a marked example actually rescues the people who bounce
    // off an empty uploader has never been measurable, because opening it fired
    // nothing. Paired with answer_input_started it answers that, and it tells us
    // whether MK-01's below-the-fold placement is helping or hiding it.
    trackFunnelEvent('example_opened', { board, source: 'mark_page' })
    setResult(fixture as MarkingResult)
    setShowingExample(true)
    setErrorMsg('')
    setMarkStreamError(null)
    // Keep deep-link / refresh in sync with the sample (and IB board).
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set(DEMO_MARK_QUERY_PARAM, '1')
      if (board === 'ib') url.searchParams.set('board', 'ib')
      window.history.replaceState(null, '', url.toString())
      window.scrollTo({ top: 0 })
    }
  }, [selectedMarkBoard])

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
    setV2OneAnswerMarking(false)
    submittingRef.current = false
    setMarkProgress(null)
    setMarkContext(null)
    setMarkStreamError(null)
    setPendingResult(null)
    pendingResultRef.current = null
    markFlowRef.current?.markingDone()
    trackFunnelEvent('mark_result_viewed', {
      attemptId: payload.attempt_id ?? null,
      subject: selectedSubject || null,
      board: selectedMarkBoard,
    })
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
    // MK-02: move keyboard/SR focus to the score once the wait tears down.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const heading = document.getElementById('mark-result-heading')
        if (!heading) return
        try {
          heading.focus({ preventScroll: true })
        } catch {
          heading.focus()
        }
        heading.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, 50)
    })
  }, [selectedSubject])

  /**
   * Show a failed mark, and leave the student able to act on it.
   *
   * When the marker reports it could not read the total from the question, the
   * "the marks are shown in my question" tick has just been tested against the
   * real thing and failed — so clearing it is simply true, and it brings the
   * number field back. Without that the notice ("enter the total, then tap Mark
   * again") points at a field the tick itself is hiding. Production has four
   * recorded retries that hit the identical error a second time, ~45s each,
   * because re-submitting unchanged was the only move the UI allowed.
   */
  function showMarkFailure(serverMessage: string) {
    setSoftMarkNotice(softNoticeForMarkFailure(serverMessage))
    if (isTotalMarksClientMessage(serverMessage)) {
      setMarksInQuestion(false)
    }
  }

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
  function handleAllowance(_block?: AllowanceBlock) {
    // The refreshed summary is what PostMarkPremiumCard renders from — the
    // card itself decides free-meter vs paid-warning vs nothing.
    refreshBillingSummary()
  }

  // V2 treats any in-flight mark as wait (covers the gap before markProgress lands).
  const waitOpen =
    cinematicActive ||
    !!markStreamError ||
    (markFlowV2 && (loading || v2OneAnswerMarking) && !result)
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    if (v2SubmitTick === 0) return
    void handleSubmitRef.current({
      preventDefault() {},
    } as React.FormEvent)
  }, [v2SubmitTick])

  useEffect(() => {
    if (!markFlowV2 || !v2OneAnswerMarking || result) return
    if (loading || markStreamError || cinematicActive) return
    const t = window.setTimeout(() => {
      setV2OneAnswerMarking((still) => {
        if (!still) return still
        markFlowRef.current?.cancelMarking()
        return false
      })
    }, 120)
    return () => window.clearTimeout(t)
  }, [
    markFlowV2,
    v2OneAnswerMarking,
    loading,
    markStreamError,
    cinematicActive,
    result,
  ])

  const retryV2Mark = () => {
    setMarkStreamError(null)
    setErrorMsg('')
    setErrorRetryable(false)
    setSoftMarkNotice(null)
    setV2OneAnswerMarking(true)
    void handleSubmit({
      preventDefault: () => {},
    } as React.FormEvent)
  }

  const cancelV2Mark = () => {
    markAbortRef.current?.abort()
    setLoading(false)
    submittingRef.current = false
    setV2OneAnswerMarking(false)
    setMarkStreamError(null)
    setMarkProgress(null)
    setMarkContext(null)
    setPendingResult(null)
    pendingResultRef.current = null
    setErrorMsg('')
    setErrorRetryable(false)
    setSoftMarkNotice(null)
    markFlowRef.current?.cancelMarking()
  }

  const markFlowSubjectOptions = useMemo(() => {
    const codes =
      markSubjectOptions.length > 0
        ? markSubjectOptions
        : SUBJECTS.filter((s) => s.markingEnabled)
            .slice(0, 12)
            .map((s) => s.code)
    return codes.map((code) => ({
      code,
      label: getSubjectByCode(code)?.label ?? code,
    }))
  }, [markSubjectOptions])

  const exitMarkFlowV2 = () => {
    setMarkFlowV2(false)
    setV2WholePaperSeed(null)
    setV2WpPhase('marking')
    setV2OneAnswerMarking(false)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('flow', 'v1')
      window.history.replaceState({}, '', url.toString())
      window.localStorage.removeItem('ms-mark-flow')
    } catch {
      /* ignore */
    }
  }

  // R1: whole-paper after Confirm — seeded WholePaperFlow (no second upload).
  if (markFlowV2 && v2WholePaperSeed) {
    const wpPageCount =
      v2WholePaperSeed.pages.length || (v2WholePaperSeed.pdf ? 1 : 0)
    const wpFlow = (
      <WholePaperFlow
        key={`v2-wp-${v2WholePaperSeed.paperCode}-${v2WholePaperSeed.paperSession}`}
        paperCode={v2WholePaperSeed.paperCode}
        paperSession={v2WholePaperSeed.paperSession}
        questionOptions={paperQuestionOptions}
        seed={{
          pages: v2WholePaperSeed.pages,
          pdf: v2WholePaperSeed.pdf,
        }}
        hideMarkAnother
        onPhaseChange={setV2WpPhase}
        onError={(msg) => {
          setErrorMsg('')
          setErrorRetryable(false)
          setSoftMarkNotice(softNoticeForMarkFailure(msg))
        }}
        onReset={() => {
          setV2WholePaperSeed(null)
          setV2WpPhase('marking')
          setErrorMsg('')
        }}
        onUnsavedChange={setWholePaperUnsaved}
        onQuotaExceeded={(data) => {
          const tier = (data.tier ?? 'free') as SubscriptionTier
          setUpgradeModal({
            variant: 'cap',
            tier,
            cap: data.cap ?? capForTier(tier),
            periodResetsAt: data.period_resets_at ?? null,
            creditBalance: data.credit_balance ?? 0,
          })
          refreshBillingSummary()
        }}
        onAllowance={handleAllowance}
        onGuestRateLimit={() => setUpgradeModal({ variant: 'anonymous' })}
        disabled={submitBlocked}
      />
    )
    return (
      <main className="app-shell app-shell-tabbed ms-mark-shell">
        <div className="ms-mark-pg min-w-0">
          <section
            className={
              v2WpPhase === 'result'
                ? 'ms-mark-flow-screen ms-mark-flow-result'
                : 'ms-mark-flow-screen ms-mark-flow-marking'
            }
            aria-labelledby={
              v2WpPhase === 'result'
                ? 'mark-flow-result-title'
                : 'mark-flow-marking-title'
            }
            aria-busy={v2WpPhase !== 'result' || undefined}
          >
            {v2WpPhase === 'result' ? (
              <h2 id="mark-flow-result-title" className="sr-only">
                Marking result
              </h2>
            ) : (
              <MarkingScreen scope="whole_paper">
                <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
                  {wpPageCount} page{wpPageCount === 1 ? '' : 's'} ·{' '}
                  {v2WholePaperSeed.paperCode} · {v2WholePaperSeed.paperSession}
                </p>
              </MarkingScreen>
            )}
            {wpFlow}
            {v2WpPhase === 'result' ? (
              <div className="mt-8">
                <button
                  type="button"
                  className="ec-btn-primary w-full justify-center sm:w-auto"
                  onClick={() => {
                    setV2WholePaperSeed(null)
                    setV2WpPhase('marking')
                    setErrorMsg('')
                  }}
                >
                  Mark another
                </button>
              </div>
            ) : null}
          </section>
          <p className="mt-8 text-center font-mono text-[11px] text-[var(--ec-text-secondary)]">
            Preview flow ·{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-[var(--ec-brand)]"
              onClick={exitMarkFlowV2}
            >
              Use classic desk
            </button>
          </p>
        </div>
        <UpgradeModal
          open={!!upgradeModal}
          onClose={() => setUpgradeModal(null)}
          variant={upgradeModal?.variant ?? 'cap'}
          tier={upgradeModal?.tier}
          cap={upgradeModal?.cap}
          periodResetsAt={upgradeModal?.periodResetsAt}
          creditBalance={upgradeModal?.creditBalance}
        />
      </main>
    )
  }

  /**
   * What sits under the wait animation on BOTH flows.
   *
   * MarkFlow v2 is still opt-in (`?flow=v2` or localStorage), so anything
   * rendered only inside its branch is invisible to almost every real student —
   * which is exactly what happened to the first cut of this. Defined once here
   * and rendered by both paths.
   *
   * The prompt is replaced by the first-pass score rather than shown alongside
   * it: predicting after seeing a number, even a provisional one, is not a
   * prediction.
   */
  const waitExtras = (() => {
    if (markStreamError || pendingResult) return null
    // Guests have no inbox and no saved result, so they genuinely do have to
    // stay — the notice is only true for signed-in students.
    const canEmail = !!billingSummary?.signedIn

    if (provisionalScore) {
      return (
        <>
          <ProvisionalScoreCard
            marksEarned={provisionalScore.marksEarned}
            totalMarks={provisionalScore.totalMarks}
          />
          {canEmail && <LeaveNoticeCard />}
        </>
      )
    }

    // The prompt carries the notice when it renders, so the two share one card.
    // When it cannot render — no run id because telemetry failed, or the student
    // skipped — the notice still has to appear on its own, because it is the
    // part that actually answers a three-minute wait.
    const promptWillRender = !!markRunId && !predictionDismissed
    return (
      <>
        {promptWillRender && (
          <PredictScorePrompt
            markRunId={markRunId}
            totalMarks={Number(totalMarksInput.trim()) || null}
            showLeaveNotice={canEmail}
            onPredicted={setPredictedMarks}
            onDismiss={() => setPredictionDismissed(true)}
          />
        )}
        {canEmail && !promptWillRender && <LeaveNoticeCard />}
      </>
    )
  })()

  // R1: Capture → Confirm → wait → result on one MarkFlow instance.
  if (
    markFlowV2 &&
    !showingExample &&
    !v2WholePaperSeed &&
    !(result?.whole_paper)
  ) {
    const showWaitChrome = waitOpen && !cinematicActive && !markStreamError
    const resultSlot =
      result && !result.whole_paper ? (
        <ResultScreen
          onMarkAnother={() => {
            markFlowRef.current?.markAnother()
            setResult(null)
            setV2WholePaperSeed(null)
            setV2OneAnswerMarking(false)
            setAnswerPages([])
            setAnswerPdf(null)
            setAnswerTextInput('')
            setQuestionTextInput('')
            setQuestionPhoto(null)
            setTotalMarksInput('')
            setErrorMsg('')
          }}
        >
          <ExaminerAdjustmentNote
            provisional={provisionalScore?.marksEarned ?? null}
            final={result.marks_earned ?? null}
            total={result.total_marks ?? null}
          />
          <PredictionGap
            predicted={result.predicted_marks ?? predictedMarks}
            earned={result.marks_earned ?? null}
            total={result.total_marks ?? null}
          />
          <MarkingResultView
            result={result}
            attemptId={result.attempt_id ?? null}
            isPaid={
              billingSummary ? hasPaidAccess(billingSummary.access) : undefined
            }
            isMax={billingSummary ? isMax(billingSummary.access) : undefined}
            evidenceDefaultOpen
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
          {result.attempt_id ? (
            <div className="mt-6">
              <SolutionSection attemptId={result.attempt_id} />
            </div>
          ) : null}
        </ResultScreen>
      ) : null

    const waitSlot = waitOpen ? (
      <section
        className="ms-mark-flow-screen ms-mark-flow-marking"
        aria-labelledby="mark-flow-marking-title"
        aria-busy="true"
      >
        {billingSummary && isMax(billingSummary.access) ? (
          <div className="mb-3">
            <MaxBadge label="Max · priority deep marking" />
          </div>
        ) : null}
        {showWaitChrome ? <MarkingScreenHeader scope="one_answer" /> : null}
        {cinematicActive || markStreamError ? (
          <CinematicMarkingExperience
            stage={markProgress?.stage ?? 'reading_work'}
            context={markContext}
            imageUrl={answerPages[0]?.previewUrl ?? null}
            resultReady={!!pendingResult}
            lineReferences={pendingResult?.line_references ?? null}
            onReveal={handleReveal}
            error={markStreamError}
            onRetry={errorRetryable ? retryV2Mark : undefined}
            onBackToUpload={cancelV2Mark}
            retryDisabled={
              loading ||
              !(
                answerPages.length > 0 ||
                !!answerPdf ||
                answerTextInput.trim().length > 0
              ) ||
              hasCompressingPages(answerPages) ||
              questionPhotoCompressing ||
              !!answerPdfError
            }
          />
        ) : (
          <p className="text-sm text-[var(--ec-text-secondary)]" role="status">
            {billingSummary && isMax(billingSummary.access)
              ? 'Max priority — starting deep mark…'
              : 'Starting the mark…'}
          </p>
        )}
        {waitExtras}
      </section>
    ) : null

    const hostSlot = resultSlot ?? waitSlot


    return (
      <main className="app-shell app-shell-tabbed ms-mark-shell">
        <div
          className={`ms-mark-pg min-w-0 ${waitOpen || result ? '' : 'ms-mark-pg--narrow'}`}
        >
          <RunningElsewhereNotice liveHere={waitOpen || !!result} />
          <MarkFlow
            ref={markFlowRef}
            board={selectedMarkBoard}
            subjectCode={selectedSubject || null}
            subjectOptions={markFlowSubjectOptions}
            pastPaperCatalog={{
              availablePapers: availablePapers as AvailablePapersMap | null,
              papersLoading,
              subjectCodes: profileSelectableSubjects.filter((code) =>
                subjectMatchesMarkBoard(code, 'cambridge')
              ),
            }}
            submitting={loading}
            submitError={softMarkNotice || errorMsg || null}
            hostSlot={hostSlot}
            onSubmit={(payload) => {
              if (payload.draft.scope === 'whole_paper') {
                const code = payload.draft.paperCode?.trim() ?? ''
                const session = payload.draft.paperSession?.trim() ?? ''
                if (!code || !session) {
                  setErrorMsg('Add the paper code and session before marking.')
                  return
                }
                if (payload.draft.board) {
                  setSelectedMarkBoard(payload.draft.board as MarkExamBoard)
                }
                if (payload.draft.subjectCode) {
                  setSelectedSubject(payload.draft.subjectCode)
                }
                setUploadMode('whole_paper')
                setErrorMsg('')
                setV2WpPhase('marking')
                setV2WholePaperSeed({
                  pages: payload.pages,
                  pdf: payload.pdfFile,
                  paperCode: code,
                  paperSession: session,
                })
                return
              }
              const isPastPaperQ = payload.draft.questionSource === 'past_paper'
              if (isPastPaperQ) {
                const code = payload.draft.paperCode?.trim() ?? ''
                const session = payload.draft.paperSession?.trim() ?? ''
                const qn = payload.draft.questionNumber?.trim() ?? ''
                const parsedCode = parsePaperCode(code)
                const parsedSession = parsePaperSession(session)
                if (!parsedCode || !parsedSession || !qn) {
                  setErrorMsg(
                    'Past paper needs a code like 9709/12, a session like May/June 2024, and a question number.'
                  )
                  markFlowRef.current?.cancelMarking()
                  setV2OneAnswerMarking(false)
                  return
                }
                flushSync(() => {
                  setV2OneAnswerMarking(true)
                  setAnswerPages(payload.pages)
                  setAnswerPdf(payload.pdfFile)
                  setAnswerTextInput(payload.typedAnswer)
                  setQuestionTextInput(payload.questionText)
                  setQuestionPhoto(payload.questionPhoto)
                  setUploadMode('single_question')
                  setMarkIntent('past_paper')
                  setShowManualPaper(true)
                  if (payload.draft.board) {
                    setSelectedMarkBoard(payload.draft.board as MarkExamBoard)
                  }
                  setSelectedSubject(parsedCode.subject)
                  setSelectedComponent(parsedCode.component)
                  setSelectedSession(parsedSession.season)
                  setSelectedYear(parsedSession.year)
                  setQuestionNumber(qn)
                  setErrorMsg('')
                })
                setV2SubmitTick((n) => n + 1)
                return
              }
              if (!payload.draft.subjectCode?.trim()) {
                setErrorMsg('Pick a subject before marking.')
                markFlowRef.current?.cancelMarking()
                setV2OneAnswerMarking(false)
                return
              }
              const combined = payload.draft.practiceKind === 'combined_script'
              flushSync(() => {
                setV2OneAnswerMarking(true)
                setAnswerPages(payload.pages)
                setAnswerPdf(payload.pdfFile)
                setAnswerTextInput(payload.typedAnswer)
                setQuestionTextInput(payload.questionText)
                setQuestionPhoto(payload.questionPhoto)
                setUploadMode('single_question')
                setMarkIntent(combined ? 'combined_script' : 'practice_question')
                setShowManualPaper(false)
                if (payload.draft.board) {
                  setSelectedMarkBoard(payload.draft.board as MarkExamBoard)
                }
                setSelectedSubject(payload.draft.subjectCode ?? '')
                setTotalMarksInput(
                  payload.draft.totalMarksHint
                    ? String(payload.draft.totalMarksHint)
                    : ''
                )
                setErrorMsg('')
              })
              setV2SubmitTick((n) => n + 1)
            }}
          />
          <p className="mt-8 text-center font-mono text-[11px] text-[var(--ec-text-secondary)]">
            Preview flow ·{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-[var(--ec-brand)]"
              onClick={() => {
                if (waitOpen) cancelV2Mark()
                exitMarkFlowV2()
              }}
            >
              Use classic desk
            </button>
          </p>
        </div>
        <UpgradeModal
          open={!!upgradeModal}
          onClose={() => setUpgradeModal(null)}
          variant={upgradeModal?.variant ?? 'cap'}
          tier={upgradeModal?.tier}
          cap={upgradeModal?.cap}
          periodResetsAt={upgradeModal?.periodResetsAt}
          creditBalance={upgradeModal?.creditBalance}
        />
      </main>
    )
  }

  return (
    <main className="app-shell app-shell-tabbed ms-mark-shell">
      <div
        className={`ms-mark-pg min-w-0 ${result ? '' : 'ms-mark-pg--narrow'}`}
      >
        <RunningElsewhereNotice liveHere={waitOpen || !!result} />
        {!result && (
          <header className="ms-mark-hero ms-fade-in">
            <div className="mb-2 flex items-center gap-2">
              <p className="ms-overline ms-mark-hero-eyebrow mb-0">Marking desk</p>
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
            </div>
            <h2 className="ms-mark-hero-title">
              {selectedMarkBoard === 'ib'
                ? 'IB examiner-style feedback'
                : selectedMarkBoard === 'edexcel'
                  ? 'Edexcel IAL examiner-style feedback'
                  : selectedMarkBoard === 'oxfordaqa'
                    ? 'OxfordAQA examiner-style feedback'
                    : selectedMarkBoard === 'aqa'
                      ? 'AQA examiner-style feedback'
                      : selectedMarkBoard === 'ap'
                        ? 'AP examiner-style feedback'
                        : 'Cambridge examiner-style feedback'}
            </h2>
            <p className="ms-mark-hero-lead">
              Upload photos or PDFs — marked in {MARK_DURATION_SINGLE} with{' '}
              {selectedMarkBoard === 'ib'
                ? 'criterion bands'
                : selectedMarkBoard === 'edexcel'
                  ? 'Edexcel method and accuracy marks'
                  : selectedMarkBoard === 'oxfordaqa'
                    ? 'OxfordAQA point and method marks'
                    : selectedMarkBoard === 'aqa'
                      ? 'AQA method and accuracy marks'
                      : selectedMarkBoard === 'ap'
                        ? 'AP free-response point marks'
                        : 'official mark scheme logic'}
              .
            </p>
            <span className="ms-mark-hero-note" aria-hidden>
              put one script under the scheme
            </span>
          </header>
        )}
        <MarkStepsBar
          stage={markStage}
          className={markStage === 0 ? 'ms-mark-steps-bar--idle' : undefined}
        />

        {!result && practiceContext && (
          <aside className="ms-mark-example-slip mb-6 min-w-0">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp shrink-0" aria-hidden>
                M1
              </span>
              <div className="ms-mark-example-slip__copy min-w-0">
                <p className="ms-mark-example-slip__title">
                  Practicing: {practiceContext.pattern}
                </p>
                <p className="ms-mark-example-slip__lead">
                  {practiceContext.reason
                    ? `${practiceContext.reason} `
                    : ''}
                  Paper and question are locked from the bank — add your answer
                  only; we mark against the official scheme.
                </p>
              </div>
            </div>
          </aside>
        )}

        {!result && !practiceContext && courseTopicContext && (
          <aside className="ms-mark-example-slip mb-6 min-w-0">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp shrink-0" aria-hidden>
                M1
              </span>
              <div className="ms-mark-example-slip__copy min-w-0">
                <p className="ms-mark-example-slip__title">
                  From your course: {courseTopicContext.topicName}
                  {courseTopicContext.topicCode !== courseTopicContext.topicName
                    ? ` (${courseTopicContext.topicCode})`
                    : ''}
                </p>
                <p className="ms-mark-example-slip__lead">
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
                    <span className="font-mono text-xs font-bold" aria-hidden>
                      -&gt;
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        )}

        {!result && !practiceContext && !courseTopicContext && ibManualCriteriaSummary && (
          <aside className="ms-mark-example-slip mb-6 min-w-0">
            <div className="ms-mark-example-slip__body">
              <span className="ec-ink-stamp shrink-0" aria-hidden>
                M1
              </span>
              <div className="ms-mark-example-slip__copy min-w-0">
                <p className="ms-mark-example-slip__title">
                  IB criterion practice — {resolveSubjectLabel(selectedSubject)}
                </p>
                <p className="ms-mark-example-slip__lead">
                  {isCombinedMode
                    ? 'Upload one PDF or photo with the question and your answer — we split them and mark band-by-band.'
                    : 'Upload your answer (and the question as text or a photo). We mark band-by-band against IB assessment criteria.'}
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--ec-brand)]">
                  {ibManualCriteriaSummary}
                </p>
              </div>
            </div>
          </aside>
        )}

        {!result && !loading && (
          <form
            onSubmit={handleSubmit}
            className={`ms-mark-form-shell space-y-8${
              uploadMode === 'single_question' ? ' ms-mark-form-shell--capture-first' : ''
            }`}
          >
            <section className="ms-mark-setup-panel ms-fade-in ms-stag-1">
            <MarkBoardPicker
              value={selectedMarkBoard}
              onChange={handleMarkBoardChange}
              disabled={profileLoading}
            />

            <div className="ms-mark-mode-panel">
              {/* MK-04: two student questions — one answer vs whole paper — not four pipelines. */}
              <SegmentedControl
                className="ms-lvl-tabs"
                optionClassName="ms-lvl-tab"
                aria-label="What are you marking?"
                aria-describedby="mark-mode-callout"
                value={uploadMode}
                onChange={(next) => {
                  if (next === 'whole_paper') {
                    if (!boardSupportsWholePaper(selectedMarkBoard)) return
                    setUploadMode('whole_paper')
                    return
                  }
                  setUploadMode('single_question')
                  if (
                    markIntent === 'past_paper' &&
                    !boardSupportsPastPaperLookup(selectedMarkBoard)
                  ) {
                    setMarkIntent('practice_question')
                  }
                }}
                options={[
                  { value: 'single_question', label: 'One answer' },
                  {
                    value: 'whole_paper',
                    label: 'Whole paper',
                    disabled: !boardSupportsWholePaper(selectedMarkBoard),
                  },
                ]}
              />

              {uploadMode === 'single_question' ? (
                <div className="ms-mark-intent-row mt-3">
                  <p className="label-overline mb-2" id="mark-intent-label">
                    Question source
                  </p>
                  <SegmentedControl
                    className="ms-ob-stamp-pick flex flex-wrap gap-2"
                    optionClassName="ms-ob-stamp-pick__btn"
                    aria-labelledby="mark-intent-label"
                    value={
                      markIntent === 'past_paper' ? 'past_paper' : 'own_question'
                    }
                    onChange={(next) => {
                      if (next === 'past_paper') {
                        setMarkIntent('past_paper')
                        return
                      }
                      setMarkIntent((prev) =>
                        prev === 'combined_script' ? 'combined_script' : 'practice_question'
                      )
                      setShowManualPaper(false)
                    }}
                    options={[
                      ...(boardSupportsPastPaperLookup(selectedMarkBoard)
                        ? [{ value: 'past_paper' as const, label: 'Past paper' }]
                        : []),
                      { value: 'own_question' as const, label: 'My own question' },
                    ]}
                  />
                  {/* MK-04: combined is a detail of “my question”, not a third pipeline. */}
                  {(markIntent === 'practice_question' ||
                    markIntent === 'combined_script') && (
                    <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-2.5 text-sm text-[var(--ec-text-secondary)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={markIntent === 'combined_script'}
                        onChange={(e) => {
                          setMarkIntent(
                            e.target.checked ? 'combined_script' : 'practice_question'
                          )
                          setShowManualPaper(false)
                        }}
                      />
                      <span>
                        Question and answer are on the{' '}
                        <strong className="font-medium text-[var(--ec-text-primary)]">
                          same page or PDF
                        </strong>
                      </span>
                    </label>
                  )}
                </div>
              ) : null}

              <p id="mark-mode-callout" className="ms-mark-mode-callout">
                {markModeCallout}{' '}
                <Link href={markLearnMoreHref} className="ec-link">
                  {markLearnMoreLabel}
                </Link>
              </p>
            </div>
            </section>

            {uploadMode === 'whole_paper' && (
            <section>
              <div className="ec-card ec-card--paper space-y-4 p-5 sm:p-6">
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
                  <div className="ms-mark-paper-slip space-y-3">
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
            <div className="ms-mark-capture-block">
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
                      <div className="ec-banner-warning-inline rounded px-4 py-3 text-sm">
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
                      setWholePaperUnsaved(false)
                      setErrorMsg('')
                    }}
                    onUnsavedChange={setWholePaperUnsaved}
                    onQuotaExceeded={(data) => {
                      const tier = (data.tier ?? 'free') as SubscriptionTier
                      setUpgradeModal({
                        variant: 'cap',
                        tier,
                        cap: data.cap ?? capForTier(tier),
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
            <>
            {lessonHandoff ? (
              <div className="ms-lesson-handoff ms-fade-in" role="status">
                <span className="ms-lesson-handoff-mark mono" aria-hidden>
                  ✎
                </span>
                <p>
                  <strong>Your answer from the lesson is below.</strong> Edit it
                  if you want — it gets marked exactly as it stands.
                </p>
                {lessonHandoff.returnTo ? (
                  <a className="ms-lesson-handoff-back" href={lessonHandoff.returnTo}>
                    Back to the lesson
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="ms-upload-grid ms-fade-in ms-stag-2">
              <div className="ms-mark-upload-zone ec-section-tint ec-section-tint--learn">
                {/* Above step 1, because the people this is for never reach
                    step 1: 1,207 of 1,300 sessions last month opened this page
                    and typed nothing. It disappears the moment they have work
                    of their own in hand. */}
                {formIsEmpty ? (
                  <StarterQuestionInvite
                    subject={selectedSubject || null}
                    onLoad={applyStarterQuestion}
                  />
                ) : null}

                <StepLabel
                  number={1}
                  label={
                    isCombinedMode
                      ? 'Upload your worksheet or script'
                      : 'Upload your answer'
                  }
                  hint={isCombinedMode ? 'question + working on same file' : 'photos or PDF'}
                />
                {/* Typing leads because it needs nothing — no photo, no scan,
                    just the keyboard already in front of you. The page
                    converted nobody in five days while a photograph was the
                    only way in, and the box that fixed that sat 1.6 screens
                    down on desktop and 2.8 on a phone: built, then buried.

                    Not offered for a scanned script, which exists to read a
                    question and its working off the same sheet. */}
                {!isCombinedMode && !hasAnswerUpload ? (
                  <>
                    <div>
                      <Label
                        htmlFor="answer-text"
                        className="label-overline mb-2 inline-block"
                      >
                        Type your answer
                      </Label>
                      <textarea
                        id="answer-text"
                        value={answerTextInput}
                        onChange={(e) => {
                          setAnswerTextInput(e.target.value)
                          if (e.target.value.trim().length > 0) {
                            trackAnswerInputStarted({
                              subject: selectedSubject || null,
                              source: 'typed',
                              board: selectedMarkBoard,
                            })
                          }
                        }}
                        onFocus={() =>
                          trackAnswerInputStarted({
                            subject: selectedSubject || null,
                            source: 'typed_focus',
                            board: selectedMarkBoard,
                          })
                        }
                        rows={7}
                        disabled={loading}
                        placeholder={
                          'Write your answer exactly as you would in the exam — working, steps and all.'
                        }
                        className="ec-input ec-question-text"
                      />
                      <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
                        Marked the same way as a photo. You will not get
                        examiner&rsquo;s ink over your page, because there is no
                        page &mdash; you get the marks, the reasons and what was
                        missing.
                      </p>
                    </div>
                    <div className="ms-mark-or-divider" aria-hidden="true">
                      <span>or upload it</span>
                    </div>
                  </>
                ) : null}

                <PageUploader
                  pages={answerPages}
                  onPagesChange={(pages) => {
                    setAnswerPages(pages)
                    if (pages.length > 0) {
                      trackAnswerInputStarted({
                        subject: selectedSubject || null,
                        source: 'upload',
                        board: selectedMarkBoard,
                      })
                    }
                  }}
                  allowPdf
                  pdfFile={answerPdf}
                  onPdfChange={setAnswerPdf}
                  onPdfError={setAnswerPdfError}
                  disabled={loading}
                  emptyLabel="Drop files here, or choose files"
                  emptyHint={
                    isCombinedMode
                      ? 'Photos or PDF — question and answer together'
                      : 'Photos or PDF — multi-page is fine'
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
                      {selectedMarkBoard === 'ib'
                        ? 'IB subject'
                        : selectedMarkBoard === 'edexcel'
                          ? 'IAL unit'
                          : selectedMarkBoard === 'oxfordaqa'
                            ? 'OxfordAQA subject'
                            : selectedMarkBoard === 'aqa'
                              ? 'AQA subject'
                              : selectedMarkBoard === 'ap'
                                ? 'AP course'
                                : 'Subject'}
                    </Label>
                    {markSubjectOptions.length === 0 ? (
                      <p className="text-sm text-[var(--ec-text-secondary)]">
                        {selectedMarkBoard === 'edexcel' ? (
                          <>
                            Edexcel IAL Maths marking is warming up.{' '}
                            <Link
                              href="/edexcel/international-a-level/mathematics"
                              className="ec-link font-medium"
                            >
                              Browse units
                            </Link>
                          </>
                        ) : (
                          <>
                            No{' '}
                            {selectedMarkBoard === 'ib'
                              ? 'IB'
                              : selectedMarkBoard === 'oxfordaqa'
                                ? 'OxfordAQA'
                                : selectedMarkBoard === 'aqa'
                                  ? 'AQA'
                                  : selectedMarkBoard === 'ap'
                                    ? 'AP'
                                    : 'Cambridge'}{' '}
                            subjects in your profile yet.{' '}
                            <Link href="/onboarding?rerun=1" className="ec-link font-medium">
                              Update subjects
                            </Link>
                          </>
                        )}
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
                      {markSubjectOptions.map((code) => {
                        if (selectedMarkBoard === 'edexcel') {
                          return (
                            <option key={code} value={code}>
                              {resolveEdexcelUnitLabel(code)}
                            </option>
                          )
                        }
                        if (
                          selectedMarkBoard === 'oxfordaqa' ||
                          selectedMarkBoard === 'aqa' ||
                          selectedMarkBoard === 'ap'
                        ) {
                          const meta = getSubjectByCode(code)
                          return (
                            <option key={code} value={code}>
                              {meta?.label ?? code}
                            </option>
                          )
                        }
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
                <div className="ms-mark-paper-slip space-y-3">
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

              {/* The paper details were never actually required to submit —
                  detection runs whenever they're absent — but presenting six
                  dropdowns up front made them look mandatory, and most people
                  who opened this page left without uploading anything. Collapsed
                  by default so the upload is the obvious next step; still one tap
                  away, and auto-expanded for anyone who arrived with a paper
                  already chosen (deep link, saved preference). */}
              {!isPracticeMode && !showManualPaper && !isManualFilled && (
                <button
                  type="button"
                  onClick={() => setShowManualPaper(true)}
                  className="ec-card flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:border-[var(--ec-brand)]/50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                      Know which paper this is? Add it{' '}
                      <span className="font-normal text-[var(--ec-text-secondary)]">
                        (optional)
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
                      We work it out from your upload. Naming the paper lets us
                      mark against the official scheme instead.
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-[var(--ec-brand)]" aria-hidden>
                    -&gt;
                  </span>
                </button>
              )}

              {!isPracticeMode && (showManualPaper || isManualFilled) && (
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
                  <span
                    className={`inline-block font-mono text-xs font-bold transition-transform duration-200 ${
                      showOptional ? 'rotate-90' : ''
                    }`}
                    aria-hidden
                  >
                    &gt;
                  </span>
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
                    <p className="mb-3 rounded border ec-tint-info-chip px-4 py-2 text-center text-xs">
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
                      {/* Shown again when the tick cannot be honoured: the
                          question is typed and the number is not in it. */}
                      {(!marksInQuestion || marksPromiseUnkeepable) && (
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
                        {/* The field stays put once the promise breaks, but
                            the instruction stops once it has been followed. */}
                        {marksPromiseBroken
                          ? QUESTION_TOTAL_PROMISE_BROKEN_MESSAGE
                          : marksInQuestion
                            ? 'We’ll read the mark total from your question image or text. If we can’t find it, you’ll need to enter it.'
                            : 'Enter the mark total so we mark out of the right number. Required when the question isn’t in our past-paper bank.'}
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
                      !hasAnswer ||
                      typedAnswerNeedsQuestion ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing ||
                      !!answerPdfError ||
                      submitBlocked ||
                      (isPracticeMode &&
                        (!selectedSubject || !hasPracticeQuestion)) ||
                      (isCombinedMode && !selectedSubject) ||
                      !totalMarksSatisfied
                    }
                    pulse={
                      hasAnswer &&
                      !loading &&
                      (isCombinedMode
                        ? !!selectedSubject
                        : !isPracticeMode ||
                          (!!selectedSubject && hasPracticeQuestion))
                    }
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
            </>
            )}
            </div>

            {softMarkNotice && !loading && !markStreamError && (
              <p
                className="mt-4 text-center text-sm leading-relaxed text-[var(--ec-text-secondary)]"
                role="status"
              >
                {softMarkNotice}
              </p>
            )}
            {errorMsg && !loading && !markStreamError && !softMarkNotice && (
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
                      !hasAnswer ||
                      typedAnswerNeedsQuestion ||
                      hasCompressingPages(answerPages) ||
                      questionPhotoCompressing ||
                      !!answerPdfError
                    }
                    className="mt-3 rounded border border-[color-mix(in_srgb,var(--ec-chip-warning-text)_40%,transparent)] bg-[var(--ec-chip-warning-bg)] px-4 py-2 text-sm font-medium text-[var(--ec-banner-warning-title)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                ) : null}
              </FormErrorAlert>
            )}
          </form>
        )}

        {/* MK-01: keep allowance / guest / example chrome below the capture path
            so the first viewport leads with upload, not banners. */}
        {!result && (
          <div className="ms-mark-defer-chrome mt-6 space-y-5">
            <BillingLimitBanner />
            {!loading && <GuestMarkNotice />}
            {!loading && <MarkExampleInvite onOpen={openExample} />}
          </div>
        )}

        {!result && !loading && <PageHelpStrip className="mt-10" />}

        <AnimatePresence>
          {waitOpen ? (
            <motion.div
              key="marking-progress"
              className="fixed inset-0 z-[55] overflow-x-clip overflow-y-auto overscroll-contain bg-[var(--ec-canvas)] px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-[calc(1rem+env(safe-area-inset-top,0px))] lg:relative lg:inset-auto lg:z-auto lg:mt-10 lg:overflow-visible lg:bg-transparent lg:p-0 lg:pb-0 lg:pt-0"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <MarkingWaitOverlay
                open={waitOpen}
                className="min-h-full outline-none lg:min-h-0"
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
                    !hasAnswer ||
                    hasCompressingPages(answerPages) ||
                    questionPhotoCompressing ||
                    !!answerPdfError
                  }
                />
                {waitExtras}
              </MarkingWaitOverlay>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {result?.whole_paper && (
          <div className="space-y-8">
            {result.multi_question && (
              <div className="ec-card flex items-start gap-3 border-[var(--ec-brand)]/30 p-4">
                <span className="ec-ink-stamp ec-ink-stamp--inline shrink-0" aria-hidden>
                  M1
                </span>
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
              isMax={billingSummary ? isMax(billingSummary.access) : undefined}
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
            {showingExample && (
              <MarkExampleBanner
                onDismiss={closeExample}
                board={
                  result.subject_code === 'ib-maths-aa' ||
                  selectedMarkBoard === 'ib'
                    ? 'ib'
                    : selectedMarkBoard === 'cambridge'
                      ? 'cambridge'
                      : 'other'
                }
              />
            )}

            {practiceContext?.returnTo === 'progress' && (
              <Link
                href="/dashboard/progress?tab=insights&drilled=1"
                className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 p-4 transition-colors hover:border-[var(--ec-brand)]/50"
              >
                <div className="flex items-start gap-3">
                  <span className="ec-ink-stamp ec-ink-stamp--inline shrink-0" aria-hidden>
              M1
            </span>
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
                  <span className="font-mono text-xs font-bold transition-transform group-hover:translate-x-0.5" aria-hidden>-&gt;</span>
                </span>
              </Link>
            )}

            {practiceContext?.returnTo === 'vault' && (
              <Link
                href="/dashboard/vault"
                className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 p-4 transition-colors hover:border-[var(--ec-brand)]/50"
              >
                <div className="flex items-start gap-3">
                  <span className="ec-ink-stamp ec-ink-stamp--inline shrink-0" aria-hidden>
                    MX
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
                      Back to Max Vault
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
                      Tick the day off your sprint checklist and check your rewrite bank.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]">
                  Open Vault
                  <span className="font-mono text-xs font-bold transition-transform group-hover:translate-x-0.5" aria-hidden>-&gt;</span>
                </span>
              </Link>
            )}

            {courseTopicContext?.returnTo ? (
              <Link
                href={courseTopicContext.returnTo}
                className="ec-card group flex items-center justify-between gap-4 border-[var(--ec-brand)]/30 p-4 transition-colors hover:border-[var(--ec-brand)]/50"
              >
                <div className="flex items-start gap-3">
                  <span className="ec-ink-stamp ec-ink-stamp--inline shrink-0" aria-hidden>
              M1
            </span>
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
                  <span className="font-mono text-xs font-bold transition-transform group-hover:translate-x-0.5" aria-hidden>-&gt;</span>
                </span>
              </Link>
            ) : null}

            {/* Not on the worked example — there is no prediction behind a
                sample answer the student never attempted. */}
            {!showingExample && (
              <>
                <ExaminerAdjustmentNote
                  provisional={provisionalScore?.marksEarned ?? null}
                  final={result.marks_earned ?? null}
                  total={result.total_marks ?? null}
                />
                <PredictionGap
                  predicted={result.predicted_marks ?? predictedMarks}
                  earned={result.marks_earned ?? null}
                  total={result.total_marks ?? null}
                />
              </>
            )}

            <MarkingResultView
              result={result}
              afterScore={
                !showingExample && result.attempt_id ? (
                  <MarkFeedbackPrompt attemptId={result.attempt_id} />
                ) : null
              }
              attemptId={result.attempt_id ?? null}
              isPaid={
                showingExample
                  ? undefined
                  : billingSummary
                    ? hasPaidAccess(billingSummary.access)
                    : undefined
              }
              isMax={
                showingExample
                  ? undefined
                  : billingSummary
                    ? isMax(billingSummary.access)
                    : undefined
              }
              isSample={showingExample}
              evidenceDefaultOpen
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
              primaryAction={
                showingExample ? (
                  <MarkExampleFooter onDismiss={closeExample} />
                ) : (
                  <>
                    {/* ON-01 / R3: target grade after value, not before. */}
                    {billingSummary?.signedIn &&
                    targetGrade === null &&
                    !gradeAskDismissed ? (
                      <PostMarkTargetGradeAsk
                        board={profileBoard}
                        onSaved={(g) => {
                          setTargetGrade(g)
                          setGradeAskDismissed(true)
                        }}
                        onDismiss={() => setGradeAskDismissed(true)}
                      />
                    ) : null}
                    {/* R3: exam date after target grade ask is resolved. */}
                    {billingSummary?.signedIn &&
                    examDate === null &&
                    !examDateAskDismissed &&
                    targetGrade !== undefined &&
                    (targetGrade !== null || gradeAskDismissed) ? (
                      <PostMarkExamDateAsk
                        onSaved={(d) => {
                          setExamDate(d)
                          setExamDateAskDismissed(true)
                        }}
                        onDismiss={() => setExamDateAskDismissed(true)}
                      />
                    ) : null}
                    {/* Guests: signup ask while marks are still on screen. */}
                    {billingSummary && !billingSummary.signedIn ? (
                      <GuestConversionPrompt
                        marksEarned={result.marks_earned ?? null}
                        totalMarks={result.total_marks ?? null}
                        weakTopics={result.ai_marking?.weak_topics ?? []}
                        markBoard={selectedMarkBoard}
                        subjectCode={selectedSubject || null}
                      />
                    ) : null}
                    <PostMarkNextSteps
                      result={result}
                      onMarkAnother={handleMarkAnotherAttempt}
                      onMarkNewQuestion={handleMarkNewQuestion}
                    />
                    {/* The next question, already chosen.
                        "Mark a new question" resets to an empty form, which put
                        the student back at the problem the starter card exists
                        to solve — bring your own question — at every mark, not
                        just the first. An active user averages 3.4 marks a month
                        against a five-mark cap, so most never reach the wall at
                        all; this is the step that closes that gap.
                        Aimed at the tags on the answer just marked, so the next
                        one lands on what they actually lost marks on. */}
                    {!showingExample ? (
                      <StarterQuestionInvite
                        variant="next"
                        subject={selectedSubject || null}
                        topic={result.syllabus_tags?.[0] ?? null}
                        onLoad={(q) => {
                          // Reset FIRST. handleMarkNewQuestion clears the
                          // question text and number, so applying before it
                          // would wipe the question we just loaded.
                          handleMarkNewQuestion()
                          applyStarterQuestion(q)
                        }}
                      />
                    ) : null}
                    {/* Premium, visible in the flow — meter + one concrete line,
                        replacing a bare "see plans" whisper. Guests get
                        GuestConversionPrompt above instead. */}
                    {!showingExample ? (
                      <PostMarkPremiumCard summary={billingSummary} />
                    ) : null}
                  </>
                )
              }
            />

            {result.attempt_id && (
              <SolutionSection attemptId={result.attempt_id} />
            )}

            {/* The feedback prompt now renders in MarkingResultView's
                afterScore slot — directly under the score, where the fairness
                judgement actually happens. It mounted here at the bottom of the
                page for a month: 111 marks, one rating. Guests included now —
                the API accepts a rating on a guest attempt gated by possession
                of its unguessable id, the same documented pattern as the
                prediction and run-status routes. */}
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
