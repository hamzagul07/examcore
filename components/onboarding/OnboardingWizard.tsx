'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { AuthShell } from '@/components/AuthShell'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { completeOnboardingRequest } from '@/lib/onboarding/complete-onboarding-client'
import { lastFunnelBoard, profileBoardFromFunnelBoard } from '@/lib/analytics/funnel'
import {
  SUBJECT_GROUPS,
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  BOARDS,
  IB_DIPLOMA_LEVEL,
  IB_BOARD_ID,
  EDEXCEL_BOARD_ID,
  isIbBoard,
  isEdexcelBoard,
  isSubjectValidForProfile,
  subjectsInGroup,
  ibSubjectGroups,
  ibSubjectsInGroup,
  edexcelSubjectGroups,
  edexcelSubjectsInGroup,
  catalogBoardSubjectGroups,
  catalogBoardSubjectsInGroup,
  isCatalogBoard,
  isOxfordaqaBoard,
  isAqaBoard,
  isApBoard,
  levelsForBoard,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import { postOnboardingHref, sanitizeNextPath } from '@/lib/auth-redirect'
import {
  inferMinimalOnboardingForContentPath,
  isContentGateReturnPath,
} from '@/lib/content-gate'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import {
  targetGradeKindFromBoard,
  targetGradeOptions,
} from '@/lib/target-grade'
import type { OnboardingInput } from '@/lib/onboarding/save-profile'
import { MARK_DURATION_SINGLE_SENTENCE } from '@/lib/copy/product-lexicon'

/** First-run is one screen (ON-01). Rerun keeps subjects → year → save. */
function totalStepsFor(rerun: boolean) {
  return rerun ? 3 : 1
}

/** sessionStorage key for the in-progress wizard draft (first-run only). */
const DRAFT_KEY = 'ms-onboarding-draft'

/**
 * Subjects a student may file. Shared by the picker, the limit copy and the
 * draft restore — those had drifted apart, and the restore was the one that
 * silently lost data.
 */
const MAX_SUBJECTS = 4

type WizardDraft = {
  step: number
  board: string
  level: string
  subjects: string[]
  stage: UserStage | null
  /** Kept for draft compat; goal step removed — always mark_papers on save. */
  primaryGoal?: PrimaryGoal | null
  examDate: string | null
  targetGrade: string | null
}

function readDraft(): WizardDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as WizardDraft
    if (typeof draft.step !== 'number' || !Array.isArray(draft.subjects)) return null
    return draft
  } catch {
    return null
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // storage unavailable — nothing to clear
  }
}

const STAGE_OPTIONS: { id: UserStage; title: string; subtitle: string }[] = [
  { id: 'as_level', title: 'AS Level', subtitle: 'Year 12' },
  { id: 'a2_level', title: 'A2 Level', subtitle: 'Year 13' },
  { id: 'other', title: 'Just exploring', subtitle: 'Other / not sure yet' },
]

const IB_STAGE_OPTIONS: { id: UserStage; title: string; subtitle: string }[] = [
  { id: 'as_level', title: 'DP Year 1', subtitle: 'First year of the Diploma' },
  { id: 'a2_level', title: 'DP Year 2', subtitle: 'Final exams year' },
  { id: 'other', title: 'Just exploring', subtitle: 'Other / not sure yet' },
]

export function OnboardingWizard({
  rerun = false,
  initialProfile = null,
  saveToken,
}: {
  rerun?: boolean
  initialProfile?: {
    board?: string
    level?: string
    subjects: string[]
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
    exam_date: string | null
    target_grade?: string | null
  } | null
  saveToken: string
}) {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const totalSteps = totalStepsFor(rerun)
  const [step, setStep] = useState(1)
  const [board, setBoard] = useState(
    () => initialProfile?.board ?? DEFAULT_BOARD
  )
  const [level, setLevel] = useState(() => {
    if (initialProfile?.level) return initialProfile.level
    if (initialProfile?.board === IB_BOARD_ID) return IB_DIPLOMA_LEVEL
    return DEFAULT_LEVEL
  })
  const [subjects, setSubjects] = useState<string[]>(initialProfile?.subjects ?? [])
  const [stage, setStage] = useState<UserStage | null>(initialProfile?.stage ?? null)
  const [examDate, setExamDate] = useState<string | null>(initialProfile?.exam_date ?? null)
  // ON-02: marketing consent must be opt-in — never pre-ticked.
  const [productUpdates, setProductUpdates] = useState(false)
  const [targetGrade, setTargetGrade] = useState<string | null>(
    initialProfile?.target_grade ?? null
  )
  const [showOptionalPlanning, setShowOptionalPlanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)

  // Restore an in-progress draft after a refresh (first run only — reruns are
  // pre-filled from the saved profile). Otherwise inherit board from /mark funnel.
  useEffect(() => {
    if (rerun) {
      setDraftRestored(true)
      return
    }
    const draft = readDraft()
    if (draft) {
      // Old multi-step drafts collapse onto the current shorter path (ON-01).
      setStep(Math.min(Math.max(draft.step, 1), totalStepsFor(false)))
      setBoard(draft.board)
      setLevel(draft.level)
      // Was slice(0, 1) while the picker allowed four and the draft saved all
      // four: selecting four subjects and then refreshing mid-onboarding threw
      // three of them away without saying so.
      setSubjects(draft.subjects.slice(0, MAX_SUBJECTS))
      setStage(draft.stage)
      setExamDate(draft.examDate)
      setTargetGrade(draft.targetGrade ?? null)
      if (draft.examDate || draft.targetGrade || draft.stage) {
        setShowOptionalPlanning(true)
      }
    } else if (!initialProfile?.board) {
      const fromFunnel = profileBoardFromFunnelBoard(lastFunnelBoard())
      if (fromFunnel) {
        setBoard(fromFunnel)
        setLevel(fromFunnel === IB_BOARD_ID ? IB_DIPLOMA_LEVEL : DEFAULT_LEVEL)
      }
    }
    setDraftRestored(true)
  }, [rerun, initialProfile?.board])

  // Keep the draft in sync so a refresh mid-wizard doesn't lose progress.
  useEffect(() => {
    if (!draftRestored || rerun) return
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          board,
          level,
          subjects,
          stage,
          examDate,
          targetGrade,
        } satisfies WizardDraft)
      )
    } catch {
      // storage unavailable (private mode / quota) — draft just won't persist
    }
  }, [
    draftRestored,
    rerun,
    step,
    board,
    level,
    subjects,
    stage,
    examDate,
    targetGrade,
  ])

  function toggleSubject(id: string) {
    setSubjects((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      // ON-01: first run needs one subject to open Mark — swapping replaces.
      if (!rerun) return [id]
      if (prev.length >= MAX_SUBJECTS) return prev
      return [...prev, id]
    })
    setErrorMsg('')
  }

  function handleBoardChange(nextBoard: string) {
    setBoard(nextBoard)
    setSubjects([])
    setLevel(isIbBoard(nextBoard) ? IB_DIPLOMA_LEVEL : DEFAULT_LEVEL)
    if (isIbBoard(nextBoard)) {
      setStage((prev) => prev ?? 'other')
    }
    // IB uses 1–7; Cambridge/Edexcel use A*–E. Clear so a leftover chip
    // doesn't look selected while the server silently drops it.
    setTargetGrade(null)
    setErrorMsg('')
  }

  function handleLevelChange(nextLevel: string) {
    setLevel(nextLevel)
    setSubjects((prev) =>
      prev.filter((id) => isSubjectValidForProfile(board, nextLevel, id))
    )
    if (nextLevel === 'O-Level') {
      setStage('other')
    }
    setErrorMsg('')
  }

  async function skipOnboardingForBrowse() {
    if (!nextParam || !isContentGateReturnPath(nextParam)) return

    const payload = inferMinimalOnboardingForContentPath(nextParam)
    if (!payload) {
      setErrorMsg('Could not open that topic yet. Pick a subject below to continue.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const result = await completeOnboardingRequest(saveToken, payload)
      if (!result.ok) {
        setErrorMsg(result.error || 'Could not save your profile. Try again.')
        return
      }
      clearDraft()
      await navigateAfterOnboarding(postOnboardingHref(nextParam, nextParam))
    } catch (err) {
      console.error('[onboarding wizard] browse skip failed:', err)
      setErrorMsg('Something went wrong. Try again or complete setup below.')
    } finally {
      setLoading(false)
    }
  }

  async function completeOnboarding(redirectHref: string) {
    if (subjects.length === 0) return

    setLoading(true)
    setErrorMsg('')

    // Goal step removed — default mark_papers; keep prior value on profile rerun.
    const primaryGoal: PrimaryGoal =
      rerun && initialProfile?.primary_goal
        ? initialProfile.primary_goal
        : 'mark_papers'

    // Stage is optional for activation (ON-01). Default "other" so Mark is never gated.
    const effectiveStage: UserStage = stage ?? 'other'

    const payload: OnboardingInput = {
      board,
      level,
      subjects,
      stage: effectiveStage,
      primary_goal: primaryGoal,
      exam_date: examDate,
      target_grade: targetGrade,
      email_product_updates: productUpdates,
      role: 'student',
    }

    try {
      const result = await completeOnboardingRequest(saveToken, payload)

      if (!result.ok) {
        if (result.status === 401) {
          setErrorMsg(result.error || 'This page expired. Refresh and try again.')
          return
        }
        setErrorMsg(result.error || 'Could not save your profile. Try again.')
        return
      }

      clearDraft()
      // ON-01: no celebration modal — first value is a mark, not a confetti gate.
      void navigateAfterOnboarding(redirectHref)
    } catch (err) {
      console.error('[onboarding wizard] save failed:', err)
      setErrorMsg('Could not save your profile. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function navigateAfterOnboarding(target: string) {
    const destination = postOnboardingHref(
      target === markHref ? nextParam : target,
      target
    )

    try {
      const supabase = createClient()
      await supabase.auth.refreshSession()
    } catch {
      // Session may already be stale — completion route restores via save token.
    }

    const params = new URLSearchParams()
    params.set('next', destination)
    params.set('token', saveToken)
    window.location.href = `/onboarding/complete?${params.toString()}`
  }

  function goNext() {
    setErrorMsg('')
    if (step === 1 && subjects.length === 0) {
      setErrorMsg('Pick at least one subject to continue.')
      return
    }
    if (rerun && step === 2 && !stage) {
      setErrorMsg('Pick where you are in your studies.')
      return
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }

  function goBack() {
    setErrorMsg('')
    setStep((s) => Math.max(s - 1, 1))
  }

  const markHref = postOnboardingHref(nextParam, rerun ? '/account/study' : '/mark')
  const signInAgainHref = `/auth/signin?next=${encodeURIComponent(
    nextParam && nextParam !== '/onboarding' ? nextParam : '/onboarding'
  )}`
  const backHref = rerun ? sanitizeNextPath(nextParam, '/account/study') : '/auth/signout'
  const backLabel = rerun ? 'Back to settings' : 'Sign out'

  function startMarking() {
    setErrorMsg('')
    if (subjects.length === 0) {
      setErrorMsg('Pick at least one subject to continue.')
      return
    }
    void completeOnboarding(markHref)
  }

  return (
    <>
      <AuthShell
        layout="onboarding"
        showBetaBadge={false}
        backLabel={backLabel}
        backHref={backHref}
        confirmBackMessage={
          rerun ? undefined : 'Sign out? Your setup progress is saved and will be here when you return.'
        }
      >
        <ProgressSteps
          current={step}
          total={totalSteps}
          labels={rerun ? RERUN_STEP_LABELS : FIRST_RUN_STEP_LABELS}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="ms-ob-step ms-ob-docket"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {!rerun ? (
              <StepSubjects
                board={board}
                onBoardChange={handleBoardChange}
                level={level}
                onLevelChange={handleLevelChange}
                selected={subjects}
                onToggle={toggleSubject}
                errorMsg={errorMsg}
                onContinue={startMarking}
                onBack={undefined}
                continueLabel={loading ? 'Filing desk…' : 'Start marking'}
                continueBusy={loading}
                firstRun
                showBrowseSkip={Boolean(nextParam && isContentGateReturnPath(nextParam))}
                browseSkipLoading={loading}
                onBrowseSkip={() => void skipOnboardingForBrowse()}
                showOptionalPlanning={showOptionalPlanning}
                onToggleOptionalPlanning={() => setShowOptionalPlanning((v) => !v)}
                stage={stage}
                onStageChange={setStage}
                examDate={examDate}
                onExamDateChange={setExamDate}
                targetGrade={targetGrade}
                onTargetGradeChange={setTargetGrade}
                productUpdates={productUpdates}
                onProductUpdatesChange={setProductUpdates}
              />
            ) : null}

            {rerun && step === 1 ? (
              <StepSubjects
                board={board}
                onBoardChange={handleBoardChange}
                level={level}
                onLevelChange={handleLevelChange}
                selected={subjects}
                onToggle={toggleSubject}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={undefined}
              />
            ) : null}

            {rerun && step === 2 ? (
              <StepStage
                board={board}
                level={level}
                selected={stage}
                onSelect={setStage}
                examDate={examDate}
                onExamDateChange={setExamDate}
                targetGrade={targetGrade}
                onTargetGradeChange={setTargetGrade}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            ) : null}

            {rerun && step === 3 ? (
              <StepFirstMark
                productUpdates={productUpdates}
                onProductUpdatesChange={setProductUpdates}
                loading={loading}
                errorMsg={errorMsg}
                signInAgainHref={signInAgainHref}
                onBack={goBack}
                onMark={() => void completeOnboarding(markHref)}
                onDashboard={() => void completeOnboarding(markHref)}
                rerun={rerun}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </AuthShell>
    </>
  )
}

const FIRST_RUN_STEP_LABELS = ['Subjects']
const RERUN_STEP_LABELS = ['Subjects', 'Your year', 'Finish']

function ProgressSteps({
  current,
  total,
  labels,
}: {
  current: number
  total: number
  labels: string[]
}) {
  if (total <= 1) {
    return (
      <div className="ms-ob-progress">
        <p className="ms-ob-progress-label" aria-hidden>
          One screen — then mark
        </p>
      </div>
    )
  }

  return (
    <div className="ms-ob-progress">
      <p className="ms-ob-progress-label" aria-hidden>
        Filing <b>{current}</b> of {total} — {labels[current - 1]}
      </p>
      <ol className="ms-ob-dots" aria-label="Onboarding progress">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1
          const done = stepNum < current
          const active = stepNum === current
          return (
            <li
              key={i}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${stepNum} of ${total}${done ? ', completed' : active ? ', current' : ''}`}
            >
              <span
                className={active ? 'on now' : done ? 'on' : undefined}
                aria-hidden
              >
                {stepNum}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepSubjects({
  board,
  onBoardChange,
  level,
  onLevelChange,
  selected,
  onToggle,
  errorMsg,
  onContinue,
  onBack,
  continueLabel = 'Continue',
  continueBusy = false,
  firstRun = false,
  showBrowseSkip = false,
  browseSkipLoading = false,
  onBrowseSkip,
  showOptionalPlanning = false,
  onToggleOptionalPlanning,
  stage = null,
  onStageChange,
  examDate = null,
  onExamDateChange,
  targetGrade = null,
  onTargetGradeChange,
  productUpdates = false,
  onProductUpdatesChange,
}: {
  board: string
  onBoardChange: (board: string) => void
  level: string
  onLevelChange: (level: string) => void
  selected: string[]
  onToggle: (id: string) => void
  errorMsg: string
  onContinue: () => void
  onBack?: () => void
  continueLabel?: string
  continueBusy?: boolean
  firstRun?: boolean
  showBrowseSkip?: boolean
  browseSkipLoading?: boolean
  onBrowseSkip?: () => void
  showOptionalPlanning?: boolean
  onToggleOptionalPlanning?: () => void
  stage?: UserStage | null
  onStageChange?: (s: UserStage) => void
  examDate?: string | null
  onExamDateChange?: (d: string | null) => void
  targetGrade?: string | null
  onTargetGradeChange?: (g: string | null) => void
  productUpdates?: boolean
  onProductUpdatesChange?: (next: boolean) => void
}) {
  const ib = isIbBoard(board)
  const edexcel = isEdexcelBoard(board)
  const catalogBoard = isCatalogBoard(board)
  const levelHeading =
    level === 'O-Level'
      ? 'O-Levels'
      : level === 'IGCSE'
        ? 'IGCSE subjects'
        : level === 'AS Level'
          ? 'AS Levels'
          : level === IB_DIPLOMA_LEVEL
            ? 'IB Diploma subjects'
            : 'A-Levels'

  const subjectGroups = ib
    ? ibSubjectGroups()
    : edexcel
      ? edexcelSubjectGroups()
      : catalogBoard
        ? catalogBoardSubjectGroups(board)
        : [...SUBJECT_GROUPS]
  const visibleLevels = levelsForBoard(board)
  const stageOptions =
    ib
      ? IB_STAGE_OPTIONS
      : level === 'O-Level' || level === 'IGCSE'
        ? STAGE_OPTIONS.filter((opt) => opt.id === 'other')
        : STAGE_OPTIONS
  const suggestions = suggestedExamDates()

  return (
    <div>
      {firstRun ? (
        <>
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Marking desk</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
          </div>
          <h1 className="ms-h2">
            What are you <em>marking</em>?
          </h1>
          <p className="ms-lead" style={{ marginTop: 12 }}>
            Pick the board and the subject you&apos;re marking now. One is enough —
            add more later in account settings or when you open courses.
          </p>
          <p className="ms-ob-hero-note" style={{ marginTop: 10 }} aria-hidden>
            one subject — then the marker
          </p>
        </>
      ) : (
        <>
          <h1 className="ms-h2">File your subjects</h1>
          <p className="ms-lead" style={{ marginTop: 12 }}>
            Pick your exam board, then choose up to four subjects. Cambridge, IB, and
            Edexcel IAL Maths/Physics/Chemistry are live — we&apos;ll tailor marking and
            progress to your choices.
          </p>
          <p className="ms-ob-hero-note" style={{ marginTop: 10 }} aria-hidden>
            max four — keep the desk clear
          </p>
        </>
      )}

      <p className="ms-overline" style={{ marginTop: 28 }} id="ob-board-label">
        Exam board
      </p>
      <SegmentedControl
        className="ms-ob-choices"
        optionClassName="ms-ob-choice"
        aria-labelledby="ob-board-label"
        value={board}
        onChange={onBoardChange}
        options={BOARDS.filter((b) => b.enabled).map((opt) => ({
          value: opt.id,
          label: (
            <>
              <span className="ms-ob-tick" aria-hidden>
                M
              </span>
              <b>{opt.label}</b>
              <span>
                {opt.id === IB_BOARD_ID
                  ? 'HL, SL & Core'
                  : opt.id === EDEXCEL_BOARD_ID
                    ? 'IAL + UK Maths/Physics units'
                    : 'A-Level, AS & O-Level'}
              </span>
            </>
          ),
        }))}
      />

      {!ib ? (
        <>
          <p className="ms-overline" style={{ marginTop: 28 }} id="ob-level-label">
            {edexcel ? 'IAL level' : 'Cambridge level'}
          </p>
          <SegmentedControl
            className="ms-ob-choices"
            optionClassName="ms-ob-choice"
            aria-labelledby="ob-level-label"
            value={level}
            onChange={onLevelChange}
            options={visibleLevels.map((opt) => ({
              value: opt.id,
              label: (
                <>
                  <span className="ms-ob-tick" aria-hidden>
                    M
                  </span>
                  <b>{opt.label}</b>
                </>
              ),
            }))}
          />
        </>
      ) : null}

      <h2 className="ms-h2" style={{ marginTop: 40, fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
        {ib
          ? 'Which IB subjects are you taking?'
          : edexcel
            ? 'Which Edexcel units are you taking?'
            : isOxfordaqaBoard(board)
              ? 'Which OxfordAQA subjects are you taking?'
              : isAqaBoard(board)
                ? 'Which AQA subjects are you taking?'
                : isApBoard(board)
                  ? 'Which AP courses are you taking?'
                  : `Which Cambridge ${levelHeading} are you taking?`}
      </h2>
      <p className="ms-lead" style={{ marginTop: 10, fontSize: 15 }}>
        {firstRun
          ? selected.length === 0
            ? 'Pick the subject you\u2019ll mark first.'
            : '1 selected — tap another to switch.'
          : `${selected.length}/4 selected — we'll surface past papers, courses, and marking for these.`}
      </p>
      <div className="ms-ob-subjects-scroll space-y-6">
        {subjectGroups.map((group) => {
          const items = ib
            ? ibSubjectsInGroup(group)
            : edexcel
              ? edexcelSubjectsInGroup(group)
              : catalogBoard
                ? catalogBoardSubjectsInGroup(board, group)
                : subjectsInGroup(group, level)
          if (!items.length) return null
          return (
            <div key={group}>
              <p className="ms-overline mb-3">{group}</p>
              <ul className="ms-ob-file-list">
                {items.map((subject) => {
                  const active = selected.includes(subject.id)
                  const atLimit = !active && selected.length >= MAX_SUBJECTS
                  const codeLabel = ib
                    ? subject.label.split(' ').slice(-1)[0]?.slice(0, 4).toUpperCase() || 'IB'
                    : subject.code
                  return (
                    <li key={subject.code}>
                      <button
                        type="button"
                        disabled={atLimit}
                        title={atLimit ? 'Deselect one to add another (max 4)' : undefined}
                        onClick={() => onToggle(subject.id)}
                        className={`ms-ob-file-row${active ? ' on' : ''}`}
                        aria-pressed={active}
                      >
                        <span className="ms-ob-file-row__code">{codeLabel}</span>
                        <span className="ms-ob-file-row__name">{subject.label}</span>
                        <span className="ms-ob-file-row__mark" aria-hidden>
                          {active ? 'M' : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      {firstRun && selected.length === 1 ? (
        <p className="ms-micro mt-3">
          Tap another subject to switch. You can file more after your first mark.
        </p>
      ) : null}
      {!firstRun && selected.length >= MAX_SUBJECTS ? (
        <p className="ms-micro mt-3">Maximum four subjects — deselect one to change.</p>
      ) : null}

      {firstRun && onToggleOptionalPlanning ? (
        <div className="mt-8 border-t border-[var(--ec-border)] pt-5">
          <button
            type="button"
            onClick={onToggleOptionalPlanning}
            className="ec-btn-ghost min-h-[44px] px-0 text-sm font-semibold"
            aria-expanded={showOptionalPlanning}
          >
            {showOptionalPlanning
              ? 'Hide exam date & target'
              : 'Optional: exam date & target grade'}
          </button>
          {showOptionalPlanning ? (
            <div className="mt-4 space-y-6">
              <div>
                <p className="ms-overline mb-3" id="ob-stage-label">
                  Where are you in your studies?
                </p>
                <SegmentedControl
                  className="ms-ob-choices ms-ob-choices--stack"
                  optionClassName="ms-ob-choice"
                  aria-labelledby="ob-stage-label"
                  value={stage}
                  onChange={(id) => onStageChange?.(id)}
                  options={stageOptions.map((opt) => ({
                    value: opt.id,
                    label: (
                      <>
                        <span className="ms-ob-tick" aria-hidden>
                          M
                        </span>
                        <b>{opt.title}</b>
                        <span>{opt.subtitle}</span>
                      </>
                    ),
                  }))}
                />
              </div>
              <div>
                <p className="ms-overline mb-2" id="ob-exam-label">
                  Exam session
                </p>
                <SegmentedControl
                  className="ms-ob-stamp-pick"
                  optionClassName="ms-ob-stamp-pick__btn"
                  aria-labelledby="ob-exam-label"
                  value={examDate}
                  onChange={(v) => onExamDateChange?.(v)}
                  options={suggestions.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </div>
              <div>
                <p className="ms-overline mb-2" id="ob-grade-label">
                  Target grade
                </p>
                <SegmentedControl
                  className="ms-ob-stamp-pick"
                  optionClassName="ms-ob-stamp-pick__btn"
                  aria-labelledby="ob-grade-label"
                  value={targetGrade}
                  onChange={(g) =>
                    onTargetGradeChange?.(targetGrade === g ? null : g)
                  }
                  options={targetGradeOptions(targetGradeKindFromBoard(board)).map(
                    (g) => ({
                      value: g,
                      label:
                        targetGradeKindFromBoard(board) === 'ib'
                          ? `G${g}`
                          : g,
                    })
                  )}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {firstRun && onProductUpdatesChange ? (
        <label className="mt-6 flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-[var(--ec-text-secondary)]">
          <input
            type="checkbox"
            checked={productUpdates}
            onChange={(e) => onProductUpdatesChange(e.target.checked)}
            className="mt-1"
          />
          <span>Email me product updates (optional — not required to mark).</span>
        </label>
      ) : null}

      {errorMsg && (
        <div className="mt-4">
          <FormErrorAlert message={errorMsg} />
        </div>
      )}
      <StepNav
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={continueLabel}
        continueBusy={continueBusy}
      />
      {firstRun ? (
        <div className="mt-3 space-y-2">
          {showBrowseSkip && onBrowseSkip ? (
            <button
              type="button"
              onClick={onBrowseSkip}
              disabled={browseSkipLoading}
              className="ec-guest-browse-skip w-full"
            >
              {browseSkipLoading ? 'Opening topic…' : 'Just browsing? Skip setup for now'}
            </button>
          ) : null}
          <a
            href="/for-teachers/start"
            className="ec-guest-browse-skip block w-full text-center"
          >
            I&apos;m a teacher, not a student
          </a>
          <p className="text-center text-xs text-[var(--ec-text-secondary)]">
            Prefer a finished example first? After filing, open{' '}
            <span className="font-mono">/mark?example=1</span> — or use the example
            invite on Mark.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function StepStage({
  board,
  level,
  selected,
  onSelect,
  examDate,
  onExamDateChange,
  targetGrade,
  onTargetGradeChange,
  errorMsg,
  onContinue,
  onBack,
}: {
  board: string
  level: string
  selected: UserStage | null
  onSelect: (s: UserStage) => void
  examDate: string | null
  onExamDateChange: (d: string | null) => void
  targetGrade: string | null
  onTargetGradeChange: (g: string | null) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  const suggestions = suggestedExamDates()
  const ib = level === IB_DIPLOMA_LEVEL
  const gradeKind = targetGradeKindFromBoard(board)
  const stageOptions =
    ib
      ? IB_STAGE_OPTIONS
      : level === 'O-Level' || level === 'IGCSE'
        ? STAGE_OPTIONS.filter((opt) => opt.id === 'other')
        : STAGE_OPTIONS

  return (
    <div>
      <h1 className="ms-h2">Where are you in your studies?</h1>
      <p className="ms-lead" style={{ marginTop: 12 }}>
        {ib
          ? 'This helps us tailor papers, countdowns, and feedback for your IB year.'
          : level === 'O-Level'
            ? 'This helps us tailor papers and feedback for your O-Level year.'
            : 'This helps us pitch feedback at the right level.'}
      </p>
      <SegmentedControl
        className="ms-ob-choices ms-ob-choices--stack"
        optionClassName="ms-ob-choice"
        aria-label="Study stage"
        value={selected}
        onChange={onSelect}
        options={stageOptions.map((opt) => ({
          value: opt.id,
          label: (
            <>
              <span className="ms-ob-tick" aria-hidden>
                M
              </span>
              <b>{opt.title}</b>
              <span>{opt.subtitle}</span>
            </>
          ),
        }))}
      />

      <div className="mt-8 border-t border-[var(--ec-border)] pt-6 text-left">
        <h2 className="ms-h2" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          When&apos;s your exam?
        </h2>
        <p className="ms-micro" style={{ marginTop: 6 }}>
          Optional — we&apos;ll show a countdown on your home page.
        </p>
        <SegmentedControl
          className="ms-ob-stamp-pick"
          optionClassName="ms-ob-stamp-pick__btn"
          aria-label="Suggested exam sessions"
          value={examDate}
          onChange={onExamDateChange}
          options={suggestions.map((s) => ({
            value: s.value,
            label: s.label,
          }))}
        />
        <label className="mt-4 block">
          <span className="text-caption mb-1.5 block">Or pick a specific date</span>
          <input
            type="date"
            value={examDate ?? ''}
            onChange={(e) => onExamDateChange(e.target.value || null)}
            className="ec-input"
          />
        </label>
        <button
          type="button"
          onClick={() => onExamDateChange(null)}
          className="ec-btn-ghost mt-3 text-sm"
        >
          I&apos;ll set this later
        </button>
      </div>

      {/* The single most valuable field in the whole wizard, and until now it
          was buried in /account/exam where nobody found it — 0 of 105 users had
          ever set one. It feeds the grade trajectory, the dashboard target
          track, the weekly examiner report and Omni's coaching, all of which
          say nothing without it. Asking here also does the quieter job: naming
          a goal you typed yourself is what makes "you're 8 points off it" land
          later. */}
      <div className="mt-8 border-t border-[var(--ec-border)] pt-6 text-left">
        <h2 className="ms-h2" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          What grade are you aiming for?
        </h2>
        <p className="ms-micro" style={{ marginTop: 6 }}>
          Optional — we&apos;ll measure every mark against it and show you the gap.
        </p>
        <SegmentedControl
          className="ms-ob-stamp-pick"
          optionClassName="ms-ob-stamp-pick__btn"
          aria-label="Target grade"
          value={targetGrade}
          onChange={(g) => onTargetGradeChange(targetGrade === g ? null : g)}
          options={targetGradeOptions(gradeKind).map((g) => ({
            value: g,
            label: gradeKind === 'ib' ? `G${g}` : g,
          }))}
        />
      </div>

      {errorMsg && <div className="mt-4"><FormErrorAlert message={errorMsg} /></div>}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepFirstMark({
  loading,
  errorMsg,
  signInAgainHref,
  onBack,
  onMark,
  onDashboard,
  productUpdates,
  onProductUpdatesChange,
  rerun = false,
}: {
  loading: boolean
  errorMsg: string
  signInAgainHref: string
  onBack: () => void
  onMark: () => void
  onDashboard: () => void
  productUpdates: boolean
  onProductUpdatesChange: (next: boolean) => void
  rerun?: boolean
}) {
  return (
    <div className={rerun ? undefined : 'ms-ob-finish'}>
      {!rerun ? (
        <div className="ms-ob-finish__meta">
          <span className="ec-ink-stamp" aria-hidden>
            M1
          </span>
          <p className="ms-overline" style={{ marginBottom: 0 }}>
            Desk ready
          </p>
        </div>
      ) : null}
      <h1 className="ms-h2">
        {rerun ? (
          'Save your updated profile'
        ) : (
          <>
            Profile filed. <em>Put ink on a script.</em>
          </>
        )}
      </h1>
      <p className="ms-lead" style={{ marginTop: 16 }}>
        {rerun
          ? 'Review your choices, then save to update your dashboard and paper recommendations.'
          : `Upload working you've already done — we'll stamp it mark-by-mark against the scheme. ${MARK_DURATION_SINGLE_SENTENCE}. Or open a finished example first, no upload needed.`}
      </p>
      {/* Consent for non-essential mail (ON-02): opt-in only, never pre-ticked.
          Lifecycle emails (results, review reminders) are separate. */}
      {!rerun && (
        <label className="ms-ob-consent">
          <input
            type="checkbox"
            checked={productUpdates}
            onChange={(e) => onProductUpdatesChange(e.target.checked)}
            disabled={loading}
          />
          <span>
            Email me occasional product updates and study tips. No more than
            twice a month — one click to turn off from any email.
          </span>
        </label>
      )}
      {errorMsg && <div className="mt-4"><FormErrorAlert message={errorMsg} /></div>}
      {errorMsg.toLowerCase().includes('expired') && (
        <p className="mt-3 text-center text-sm">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ec-link ec-auth-footer-link"
          >
            Refresh page
          </button>
          {' · '}
          <Link href={signInAgainHref} className="ec-link ec-auth-footer-link">
            Sign in again
          </Link>
        </p>
      )}
      <div className="ms-ob-nav ms-ob-nav--stack">
        <button
          type="button"
          disabled={loading}
          aria-busy={loading || undefined}
          data-loading={loading ? 'true' : undefined}
          onClick={onMark}
          className="ec-btn-primary w-full justify-center inline-flex items-center gap-2"
        >
          {loading ? (
            <ButtonLoadingState mode="morph" loadingText="Saving profile…">
              {rerun ? 'Save and return to settings' : 'Mark a question now'}
            </ButtonLoadingState>
          ) : rerun ? (
            <>Save and return to settings</>
          ) : (
            <>
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark a question now
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </>
          )}
        </button>
        {!rerun && (
          <button
            type="button"
            disabled={loading}
            onClick={onDashboard}
            className="ec-btn-ghost w-full justify-center"
          >
            See a marked example first
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="ec-btn-underline inline-flex items-center gap-1.5"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            &lt;-
          </span>
          Back
        </button>
      </div>
    </div>
  )
}

function StepNav({
  onBack,
  onContinue,
  continueLabel,
  continueBusy = false,
}: {
  onBack?: () => void
  onContinue: () => void
  continueLabel: string
  continueBusy?: boolean
}) {
  return (
    <div className="ms-ob-nav">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="ec-btn-underline inline-flex items-center gap-1.5"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            &lt;-
          </span>
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={continueBusy}
        aria-busy={continueBusy || undefined}
        className="ec-btn-primary inline-flex items-center gap-2 disabled:opacity-55"
      >
        {continueLabel}
        {!continueBusy ? (
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        ) : null}
      </button>
    </div>
  )
}
