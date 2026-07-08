'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { createClient } from '@/lib/supabase'
import { AuthShell } from '@/components/AuthShell'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { CelebrationModal } from '@/components/ui/CelebrationModal'
import { completeOnboardingRequest } from '@/lib/onboarding/complete-onboarding-client'
import {
  SUBJECT_GROUPS,
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  BOARDS,
  IB_DIPLOMA_LEVEL,
  IB_BOARD_ID,
  isIbBoard,
  isSubjectValidForProfile,
  subjectsInGroup,
  ibSubjectGroups,
  ibSubjectsInGroup,
  levelsForBoard,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import { postOnboardingHref, sanitizeNextPath } from '@/lib/auth-redirect'
import {
  inferMinimalOnboardingForContentPath,
  isContentGateReturnPath,
} from '@/lib/content-gate'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import type { OnboardingInput } from '@/lib/onboarding/save-profile'

const TOTAL_STEPS = 5

/** sessionStorage key for the in-progress wizard draft (first-run only). */
const DRAFT_KEY = 'ms-onboarding-draft'

type WizardDraft = {
  step: number
  board: string
  level: string
  subjects: string[]
  stage: UserStage | null
  primaryGoal: PrimaryGoal | null
  examDate: string | null
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

const GOAL_OPTIONS: {
  id: PrimaryGoal
  title: string
  subtitle: string
}[] = [
  {
    id: 'mark_papers',
    title: 'Mark practice papers',
    subtitle: 'Most students start here',
  },
  {
    id: 'track_progress',
    title: 'Track my progress per topic',
    subtitle: 'Mastery matrix & grade trajectory',
  },
  {
    id: 'essay_feedback',
    title: 'Get feedback on essays',
    subtitle: 'History, Law, Sociology & more',
  },
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
  } | null
  saveToken: string
}) {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const [step, setStep] = useState(rerun ? 2 : 1)
  const [board, setBoard] = useState(initialProfile?.board ?? DEFAULT_BOARD)
  const [level, setLevel] = useState(() => {
    if (initialProfile?.level) return initialProfile.level
    if (initialProfile?.board === IB_BOARD_ID) return IB_DIPLOMA_LEVEL
    return DEFAULT_LEVEL
  })
  const [subjects, setSubjects] = useState<string[]>(initialProfile?.subjects ?? [])
  const [stage, setStage] = useState<UserStage | null>(initialProfile?.stage ?? null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(
    initialProfile?.primary_goal ?? null
  )
  const [examDate, setExamDate] = useState<string | null>(initialProfile?.exam_date ?? null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [pendingHref, setPendingHref] = useState('/mark')
  const [draftRestored, setDraftRestored] = useState(false)

  // Restore an in-progress draft after a refresh (first run only — reruns are
  // pre-filled from the saved profile).
  useEffect(() => {
    if (rerun) {
      setDraftRestored(true)
      return
    }
    const draft = readDraft()
    if (draft) {
      setStep(Math.min(Math.max(draft.step, 1), TOTAL_STEPS))
      setBoard(draft.board)
      setLevel(draft.level)
      setSubjects(draft.subjects)
      setStage(draft.stage)
      setPrimaryGoal(draft.primaryGoal)
      setExamDate(draft.examDate)
    }
    setDraftRestored(true)
  }, [rerun])

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
          primaryGoal,
          examDate,
        } satisfies WizardDraft)
      )
    } catch {
      // storage unavailable (private mode / quota) — draft just won't persist
    }
  }, [draftRestored, rerun, step, board, level, subjects, stage, primaryGoal, examDate])

  function toggleSubject(id: string) {
    setSubjects((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 4) return prev
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
    if (!stage || !primaryGoal || subjects.length === 0) return

    setLoading(true)
    setErrorMsg('')

    const payload: OnboardingInput = {
      board,
      level,
      subjects,
      stage,
      primary_goal: primaryGoal,
      exam_date: examDate,
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
      setPendingHref(redirectHref)
      if (rerun) {
        void navigateAfterOnboarding(redirectHref)
        return
      }
      setShowCelebration(true)
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

  function finishCelebration() {
    setShowCelebration(false)
    void navigateAfterOnboarding(pendingHref)
  }

  function goNext() {
    setErrorMsg('')
    if (step === 2 && subjects.length === 0) {
      setErrorMsg('Pick at least one subject to continue.')
      return
    }
    if (step === 3 && !stage) {
      setErrorMsg('Pick where you are in your studies.')
      return
    }
    if (step === 4 && !primaryGoal) {
      setErrorMsg('Pick what you want to focus on.')
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
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
        <ProgressSteps current={step} total={TOTAL_STEPS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="ms-ob-step"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {step === 1 && (
              <StepWelcome
                onContinue={goNext}
                showBrowseSkip={Boolean(nextParam && isContentGateReturnPath(nextParam))}
                browseSkipLoading={loading}
                onBrowseSkip={() => void skipOnboardingForBrowse()}
              />
            )}
            {step === 2 && (
              <StepSubjects
                board={board}
                onBoardChange={handleBoardChange}
                level={level}
                onLevelChange={handleLevelChange}
                selected={subjects}
                onToggle={toggleSubject}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <StepStage
                level={level}
                selected={stage}
                onSelect={setStage}
                examDate={examDate}
                onExamDateChange={setExamDate}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <StepGoal
                selected={primaryGoal}
                onSelect={setPrimaryGoal}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 5 && (
              <StepFirstMark
                loading={loading}
                errorMsg={errorMsg}
                signInAgainHref={signInAgainHref}
                onBack={goBack}
                onMark={() => completeOnboarding(rerun ? markHref : markHref)}
                onDashboard={() =>
                  completeOnboarding(rerun ? markHref : '/dashboard')
                }
                rerun={rerun}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AuthShell>

      <CelebrationModal
        open={showCelebration}
        title="You're all set!"
        message="Your profile is ready. Time to see what examiner-style feedback looks like."
        onDismiss={finishCelebration}
      />
    </>
  )
}

const STEP_LABELS = ['Welcome', 'Subjects', 'Your year', 'Your goal', 'Finish']

function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="ms-ob-progress">
      <p className="ms-ob-progress-label" aria-hidden>
        Step <b>{current}</b> of {total} — {STEP_LABELS[current - 1]}
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
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepWelcome({
  onContinue,
  showBrowseSkip = false,
  browseSkipLoading = false,
  onBrowseSkip,
}: {
  onContinue: () => void
  showBrowseSkip?: boolean
  browseSkipLoading?: boolean
  onBrowseSkip?: () => void
}) {
  return (
    <div>
      {/* Miniature marked answer — a preview of what the product does. */}
      <div className="mb-10 mt-2 flex justify-center" aria-hidden>
        <div className="ms-ob-hero">
          <div className="ms-ob-hero-glow" />
          <div className="ms-ob-hero-paper">
            <span className="ms-ob-hero-score">7/8</span>
            <div className="ms-ob-hero-row">
              <span className="ms-ob-hero-line" />
              <span className="ms-ob-hero-badge good">
                <Check className="h-3 w-3" /> M1
              </span>
            </div>
            <div className="ms-ob-hero-row">
              <span className="ms-ob-hero-line short" />
              <span className="ms-ob-hero-badge good">
                <Check className="h-3 w-3" /> A1
              </span>
            </div>
            <div className="ms-ob-hero-row">
              <span className="ms-ob-hero-line" />
              <span className="ms-ob-hero-badge part">±1 B1</span>
            </div>
          </div>
        </div>
      </div>
      <h1 className="ms-h2">
        Welcome to <em>MarkScheme</em>
      </h1>
      <p className="ms-lead" style={{ marginTop: 16 }}>
        Let&apos;s set up your account so we can mark your work the way you need
        — Cambridge or IB Diploma, real mark schemes, honest feedback, about a
        minute per question.
      </p>
      <div className="ms-ob-nav">
        <button type="button" onClick={onContinue} className="ec-btn-primary">
          Let&apos;s go <ArrowRight className="h-4 w-4" />
        </button>
        {showBrowseSkip && onBrowseSkip ? (
          <button
            type="button"
            onClick={onBrowseSkip}
            disabled={browseSkipLoading}
            className="ec-guest-browse-skip mt-3 w-full"
          >
            {browseSkipLoading ? 'Opening topic…' : 'Just browsing? Skip setup for now'}
          </button>
        ) : null}
      </div>
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
}: {
  board: string
  onBoardChange: (board: string) => void
  level: string
  onLevelChange: (level: string) => void
  selected: string[]
  onToggle: (id: string) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  const ib = isIbBoard(board)
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

  const subjectGroups = ib ? ibSubjectGroups() : [...SUBJECT_GROUPS]
  const visibleLevels = levelsForBoard(board)

  return (
    <div>
      <h1 className="ms-h2">What are you studying?</h1>
      <p className="ms-lead" style={{ marginTop: 12 }}>
        Pick your exam board, then choose up to four subjects. Cambridge and IB are
        separate — we&apos;ll tailor marking and progress to your choices.
      </p>

      <p className="ms-overline" style={{ marginTop: 28 }}>
        Exam board
      </p>
      <div className="ms-ob-choices" style={{ marginTop: 12 }}>
        {BOARDS.filter((b) => b.enabled).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onBoardChange(opt.id)}
            className={`ms-ob-choice${board === opt.id ? ' on' : ''}`}
          >
            <span className="ms-ob-tick" aria-hidden>
              <Check className="h-3.5 w-3.5" />
            </span>
            <b>{opt.label}</b>
            <span>{opt.id === IB_BOARD_ID ? 'HL, SL & Core' : 'A-Level, AS & O-Level'}</span>
          </button>
        ))}
      </div>

      {!ib ? (
        <>
          <p className="ms-overline" style={{ marginTop: 28 }}>
            Cambridge level
          </p>
          <div className="ms-ob-choices" style={{ marginTop: 12 }}>
            {visibleLevels.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onLevelChange(opt.id)}
                className={`ms-ob-choice${level === opt.id ? ' on' : ''}`}
              >
                <span className="ms-ob-tick" aria-hidden>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <b>{opt.label}</b>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="ms-h2" style={{ marginTop: 40, fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}>
        {ib ? 'Which IB subjects are you taking?' : `Which Cambridge ${levelHeading} are you taking?`}
      </h2>
      <p className="ms-lead" style={{ marginTop: 10, fontSize: 15 }}>
        {selected.length}/4 selected — we&apos;ll surface past papers, courses, and marking for
        these.
      </p>
      <div className="ms-ob-subjects-scroll space-y-6">
        {subjectGroups.map((group) => {
          const items = ib ? ibSubjectsInGroup(group) : subjectsInGroup(group, level)
          if (!items.length) return null
          return (
            <div key={group}>
              <p className="ms-overline mb-3">{group}</p>
              <div className="ms-ob-subjects" style={{ justifyContent: 'flex-start' }}>
                {items.map((subject) => {
                  const active = selected.includes(subject.id)
                  const atLimit = !active && selected.length >= 4
                  return (
                    <button
                      key={subject.code}
                      type="button"
                      disabled={atLimit}
                      title={atLimit ? 'Deselect one to add another (max 4)' : undefined}
                      onClick={() => onToggle(subject.id)}
                      className={`ms-ob-chip${active ? ' on' : ''}${atLimit ? ' opacity-50' : ''}`}
                      aria-pressed={active}
                    >
                      {active && (
                        <Check className="ms-ob-chip-check" aria-hidden />
                      )}
                      {ib ? subject.label : `${subject.label} · ${subject.code}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {selected.length >= 4 ? (
        <p className="ms-micro mt-3">Maximum four subjects — deselect one to change.</p>
      ) : null}
      {errorMsg && (
        <div className="mt-4">
          <FormErrorAlert message={errorMsg} />
        </div>
      )}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepStage({
  level,
  selected,
  onSelect,
  examDate,
  onExamDateChange,
  errorMsg,
  onContinue,
  onBack,
}: {
  level: string
  selected: UserStage | null
  onSelect: (s: UserStage) => void
  examDate: string | null
  onExamDateChange: (d: string | null) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  const suggestions = suggestedExamDates()
  const ib = level === IB_DIPLOMA_LEVEL
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
      <div className="ms-ob-choices" style={{ gridTemplateColumns: '1fr' }}>
        {stageOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`ms-ob-choice${selected === opt.id ? ' on' : ''}`}
          >
            <span className="ms-ob-tick" aria-hidden>
              <Check className="h-3.5 w-3.5" />
            </span>
            <b>{opt.title}</b>
            <span>{opt.subtitle}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 border-t border-[var(--ec-border)] pt-6 text-left">
        <h2 className="ms-h2" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
          When&apos;s your exam?
        </h2>
        <p className="ms-micro" style={{ marginTop: 6 }}>
          Optional — we&apos;ll show a countdown on your home page.
        </p>
        <div className="ms-ob-subjects" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onExamDateChange(s.value)}
              className={`ms-ob-chip${examDate === s.value ? ' on' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
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

      {errorMsg && <div className="mt-4"><FormErrorAlert message={errorMsg} /></div>}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepGoal({
  selected,
  onSelect,
  errorMsg,
  onContinue,
  onBack,
}: {
  selected: PrimaryGoal | null
  onSelect: (g: PrimaryGoal) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h1 className="ms-h2">What&apos;s your main goal?</h1>
      <p className="ms-lead" style={{ marginTop: 12 }}>
        We&apos;ll prioritize the right parts of your dashboard.
      </p>
      <div className="ms-ob-choices" style={{ gridTemplateColumns: '1fr' }}>
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`ms-ob-choice${selected === opt.id ? ' on' : ''}`}
          >
            <span className="ms-ob-tick" aria-hidden>
              <Check className="h-3.5 w-3.5" />
            </span>
            <b>{opt.title}</b>
            <span>{opt.subtitle}</span>
          </button>
        ))}
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
  rerun = false,
}: {
  loading: boolean
  errorMsg: string
  signInAgainHref: string
  onBack: () => void
  onMark: () => void
  onDashboard: () => void
  rerun?: boolean
}) {
  return (
    <div>
      <h1 className="ms-h2">
        {rerun ? (
          'Save your updated profile'
        ) : (
          <>
            You&apos;re all set. <em>Mark your first question.</em>
          </>
        )}
      </h1>
      <p className="ms-lead" style={{ marginTop: 16 }}>
        {rerun
          ? 'Review your choices, then save to update your dashboard and paper recommendations.'
          : "Upload something you've already done. We'll mark it and show you what an examiner-style review looks like — usually under a minute."}
      </p>
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
          className="ec-btn-primary w-full justify-center"
        >
          {loading ? (
            <ButtonLoadingState mode="morph" loadingText="Saving profile…">
              {rerun ? 'Save and return to settings' : 'Mark a question now'}
            </ButtonLoadingState>
          ) : rerun ? (
            <>Save and return to settings</>
          ) : (
            <>Mark a question now <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
        {!rerun && (
          <button
            type="button"
            disabled={loading}
            onClick={onDashboard}
            className="ec-btn-ghost w-full justify-center"
          >
            Explore the dashboard first
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="ec-btn-underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    </div>
  )
}

function StepNav({
  onBack,
  onContinue,
  continueLabel,
}: {
  onBack: () => void
  onContinue: () => void
  continueLabel: string
}) {
  return (
    <div className="ms-ob-nav">
      <button type="button" onClick={onBack} className="ec-btn-underline">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <button type="button" onClick={onContinue} className="ec-btn-primary">
        {continueLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
