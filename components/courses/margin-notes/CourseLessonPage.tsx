'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import type { AccentToken } from '@/lib/courses/margin-notes/types'
import { saveLastLesson } from '@/lib/courses/margin-notes/continue-learning'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { Ring } from '@/components/courses/margin-notes/Ring'
import { ReadingProgress } from '@/components/courses/margin-notes/ReadingProgress'
import { MarginNote } from '@/components/courses/margin-notes/HandAnnotations'
import { LessonEndBlock } from '@/components/courses/margin-notes/LessonEndBlock'
import { CourseLessonDiagramShell } from '@/components/courses/margin-notes/CourseLessonDiagramShell'
import { LessonComparisonTable } from '@/components/courses/margin-notes/LessonComparisonTable'
import { LessonFigureBlock } from '@/components/courses/figures/LessonFigureBlock'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { ExplainBlock } from '@/components/courses/ExplainBlock'
import { FeatureHint, markHintUsed } from '@/components/courses/FeatureHint'
import { ResumeStrip } from '@/components/courses/ResumeStrip'
import { StudyStages, StudyStageFooter } from '@/components/courses/StudyStages'
import { Highlighter, useHighlights } from '@/components/courses/Highlighter'
import { HighlightRecap } from '@/components/courses/HighlightRecap'
import {
  stagesPresent,
  stageForSection,
  stepStage,
  STUDY_PREF_KEY,
} from '@/lib/courses/study-mode'
import type { StageId } from '@/lib/courses/lesson-stages'
import { resumeState } from '@/lib/courses/lesson-resume'
import { HINT_KEYS, type HintKey } from '@/lib/courses/first-run'
import { CriterionLadder } from '@/components/courses/CriterionLadder'
import type { CriterionLadderData } from '@/lib/courses/criterion-ladder.server'
import { useLessonStepSync } from '@/lib/courses/use-lesson-step-sync'
import { useSectionReveal } from '@/lib/courses/use-section-reveal'
import { useLessonProgress } from '@/lib/courses/use-lesson-progress'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { buildSignInHref } from '@/lib/auth-redirect'
import { LessonUpsell } from '@/components/billing/LessonUpsell'
import type { EffectiveAccess } from '@/lib/billing/access'
import { INTERACTIVE_DIAGRAMS_FREE, QUICK_CHECK_FREE } from '@/lib/billing/features'
import {
  jumpTo,
  scrollToElement,
  lessonTopicHref,
  FormulaCard,
  Worked,
  ConceptMapBlock,
  Glossary,
  QuickCheck,
  Flashcards,
  SecHead,
  Faq,
  PracticeSection,
  LessonCheckpoint,
  LessonMasteryBand,
} from './lesson-blocks'

type Props = {
  lesson: MarginNotesLesson
  subjectAcc: AccentToken
  paperQuery?: string | null
  signedIn?: boolean
  /** Effective access level; undefined while loading (renders full content for SEO). */
  access?: EffectiveAccess
  /** URL prefix for course links — '/courses' (Cambridge) or '/ib/courses' (IB). */
  basePath?: string
  /** First breadcrumb crumb — defaults to the Cambridge "Courses" hub. */
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
  /** Verbatim IB criteria for this lesson's component, fetched server-side. */
  criterionLadder?: CriterionLadderData | null
  /** Board study-path override — flips practice CTAs to that board's mark URL. */
  markHrefOverride?: string | null
  markCtaLabel?: string
}

export function CourseLessonPage({
  lesson: L,
  subjectAcc,
  paperQuery,
  signedIn,
  access,
  basePath = '/courses',
  coursesCrumb = { label: 'Courses', href: '/courses' },
  community,
  criterionLadder,
  markHrefOverride,
  markCtaLabel,
}: Props) {
  // Free tier sees notes + formulas only — live diagrams, practice, and
  // interactive blocks are gated. SSR keeps access undefined → unlocked for SEO.
  // After hydration, treat unresolved access as pending-locked so free readers
  // never see premium blocks appear then vanish (CO-01).
  const [clientMounted, setClientMounted] = useState(false)
  useEffect(() => {
    setClientMounted(true)
  }, [])
  const accessPending = clientMounted && access === undefined
  const locked = access === 'free'
  // Hide premium interactive blocks until access resolves (and for free tier).
  const premiumHidden = locked || accessPending
  // Interactive diagrams are free during launch (see INTERACTIVE_DIAGRAMS_FREE),
  // so they stay open even for the free tier. Everything else follows premiumHidden.
  const diagramsLocked = premiumHidden && !INTERACTIVE_DIAGRAMS_FREE
  // Quick check is free for everyone (see QUICK_CHECK_FREE): zero marginal cost,
  // and it is the only block that asks a free reader to produce rather than read.
  const quizLocked = premiumHidden && !QUICK_CHECK_FREE
  const acc = accentCssVar(subjectAcc)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { done, toggle } = useCourseProgress(L.code)
  const isDone = done.has(L.slug)
  const [celebrate, setCelebrate] = useState(false)

  const handleComplete = useCallback(() => {
    if (isDone) {
      toggle(L.slug, false)
      setCelebrate(false)
      return
    }
    toggle(L.slug, true)
    setCelebrate(true)
  }, [isDone, toggle, L.slug])

  useEffect(() => {
    if (!celebrate) return
    const t = window.setTimeout(() => setCelebrate(false), 4000)
    return () => window.clearTimeout(t)
  }, [celebrate])

  const [mode, setMode] = useState<'learn' | 'papers'>('learn')
  const [simpler, setSimpler] = useState(false)
  const [step, setStep] = useState(1)
  const [active, setActive] = useState('')

  const prev = L.prev
  const next = L.next
  const related = L.related ?? []

  const hasVisual = L.hasVisual
  const practiceCount =
    L.practiceQuestions?.length ?? (L.practice ? 1 : 0)

  // Mirrors CourseLessonDiagramShell's own step count for the non-explorable
  // path. Over-estimating is harmless — the shell clamps the index it is given —
  // whereas under-estimating would strand the last beats unreachable by scroll.
  const syncStepCount = Math.max(
    L.steps?.length ?? 0,
    L.diagramSpec?.steps?.length ?? 0,
    1
  )
  // Pointless without both halves on screen: a diagram to advance and prose to
  // advance it from. Single-step diagrams have nothing to sync.
  // L.hasDiagram, not hasVisual: a lesson with only step cards renders no
  // diagram, and pinning an empty column beside the prose looked broken.
  const stepSyncEnabled =
    L.hasDiagram && !diagramsLocked && !!L.notes?.length && syncStepCount > 1

  // Sections settle in as they arrive. Re-runs when the tab changes, since the
  // papers panel mounts a different set of sections.
  useSectionReveal('.lsec', mode === 'learn')

  const registerNoteBlock = useLessonStepSync({
    stepCount: syncStepCount,
    setStep,
    enabled: stepSyncEnabled,
  })

  const setLessonMode = useCallback(
    (next: 'learn' | 'papers') => {
      setMode(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'papers') params.set('mode', 'papers')
      else params.delete('mode')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Hand-off after the last quick check: the student has just produced answers,
  // which is the closest they get to attempting a real question without doing it.
  // Keep board/unit query on return so Edexcel study bridge survives /mark.
  const lessonReturnPath = useMemo(() => {
    const board = searchParams.get('board')?.toLowerCase()
    const unit = searchParams.get('unit')?.trim().toUpperCase()
    const subject = searchParams.get('subject')?.trim().toLowerCase()
    if (board === 'edexcel' && unit) {
      return `${pathname}?board=edexcel&unit=${encodeURIComponent(unit)}`
    }
    if (board === 'oxfordaqa' && subject) {
      return `${pathname}?board=oxfordaqa&subject=${encodeURIComponent(subject)}`
    }
    if (board === 'aqa' && subject) {
      return `${pathname}?board=aqa&subject=${encodeURIComponent(subject)}`
    }
    if (board === 'ap' && subject) {
      return `${pathname}?board=ap&subject=${encodeURIComponent(subject)}`
    }
    return pathname
  }, [pathname, searchParams])

  const quizPractice = L.practiceQuestions?.[0] ?? L.practice ?? null
  // Deliberately NOT gated on `locked`. The href is a /mark deep link, and
  // marking has a free tier — this is the one moment a free reader has just
  // written three answers and is closest to attempting a real question. Hiding
  // the bridge from exactly that student would be backwards.
  const quizPracticeHref = quizPractice
    ? markHrefOverride ??
      appendMarkReturn(quizPractice.href, lessonReturnPath, L.point)
    : null
  const studyBoard = searchParams.get('board')?.toLowerCase()
  const boardStudyVisit = Boolean(markHrefOverride)

  const toc = useMemo(
    () =>
      [
        { id: 'simple', label: 'Simple explanation', on: !!L.simple },
        { id: 'syllabus', label: 'Syllabus coverage', on: !!L.subtopics?.length },
        { id: 'criteria', label: 'How it’s marked', on: !!criterionLadder },
        { id: 'visual', label: 'Visual learning', on: L.hasDiagram && !diagramsLocked },
        { id: 'figures', label: 'Figures', on: !!L.figures?.length },
        { id: 'formulas', label: 'Key formulas', on: !!L.formulas?.length },
        { id: 'compare', label: 'Side by side', on: !!L.comparisonTable },
        { id: 'notes', label: 'Full notes', on: !!L.notes?.length },
        { id: 'worked', label: 'Worked examples', on: !!L.worked?.length },
        { id: 'cmap', label: 'Concept map', on: !!L.conceptMap && !premiumHidden },
        { id: 'glossary', label: 'Glossary', on: !!L.glossary?.length },
        { id: 'quiz', label: 'Quick check', on: !!L.quiz?.length && !quizLocked },
        { id: 'cards', label: 'Flashcards', on: !!L.flashcards?.length && !premiumHidden },
        { id: 'takeaways', label: 'Key takeaways', on: !!L.takeaways?.length },
        { id: 'practice', label: 'Practice', on: !!L.practice && !premiumHidden },
        { id: 'resources', label: 'Extra links', on: !!L.resources?.length },
        { id: 'faqs', label: 'FAQs', on: !!L.faqs?.length },
      ].filter((s) => s.on),
    [L, premiumHidden, diagramsLocked, quizLocked, criterionLadder]
  )

  // Real progress: which sections the student has actually worked through.
  // Replaces scroll position, which reported 99% for anyone who flicked to the
  // bottom and 15% for anyone who read three sections carefully.
  const {
    readIds,
    percent: lessonPercent,
    markInteracted,
  } = useLessonProgress(
    toc.map((t) => t.id),
    L.lessonSlug
  )

  // What to say to somebody who has been here before. Silent on a first visit.
  const resume = useMemo(
    () =>
      resumeState(toc, readIds, {
        checkId: L.quiz?.length && !quizLocked ? 'quiz' : undefined,
        checkDone: readIds.has('quiz'),
      }),
    [L.quiz?.length, quizLocked, readIds, toc]
  )

  useEffect(() => {
    setActive((prev) => (toc.some((t) => t.id === prev) ? prev : toc[0]?.id ?? ''))
  }, [toc])

  // ── Study mode ────────────────────────────────────────────────────────────
  // The same page, walked one stage at a time. Off by default and hidden purely
  // in CSS, so the served HTML is byte-identical either way and the indexed
  // lesson URLs keep every word crawlers see today.
  const articleRef = useRef<HTMLElement | null>(null)
  const [study, setStudy] = useState(false)
  const [stage, setStage] = useState<StageId | null>(null)

  const stages = useMemo(() => stagesPresent(toc.map((t) => t.id)), [toc])

  // A stage counts as done when every section in it is done, so the ticks come
  // from the same progress the document mode shows.
  const doneStages = useMemo(() => {
    const out = new Set<StageId>()
    for (const s of stages) {
      const inStage = toc.filter((t) => stageForSection(t.id) === s)
      if (inStage.length && inStage.every((t) => readIds.has(t.id))) out.add(s)
    }
    return out
  }, [readIds, stages, toc])

  useEffect(() => {
    try {
      const pref = window.localStorage.getItem(STUDY_PREF_KEY)
      if (pref === '1') {
        setStudy(true)
      } else if (pref === '0') {
        setStudy(false)
      } else {
        // No saved preference: phone defaults to staged Study (CO-02); desktop stays document.
        setStudy(window.matchMedia('(max-width: 860px)').matches)
      }
    } catch {
      /* private mode: document view is the safe default */
    }
  }, [])

  // Land on the first unfinished stage rather than always at the start —
  // reopening a lesson should not make you click past what you already did.
  useEffect(() => {
    if (!study || !stages.length) return
    setStage((prev) => {
      if (prev && stages.includes(prev)) return prev
      // An inbound #hash names the section somebody was sent here for, so its
      // stage beats "where you left off". Resolved here rather than in the
      // scroll handler because that races with this effect on a cold load.
      const hash = window.location.hash.replace('#', '')
      const hashStage = hash ? stageForSection(hash) : null
      if (hashStage && stages.includes(hashStage)) return hashStage
      return stages.find((s) => !doneStages.has(s)) ?? stages[0]!
    })
  }, [doneStages, stages, study])

  const activeStage = study ? stage : null

  // Highlights. Painted with the CSS Custom Highlight API rather than wrapped
  // in <mark>, so nothing is inserted into DOM that React owns — see
  // highlight-dom.ts for why that matters here.
  const {
    list: highlights,
    setList: setHighlights,
    supported: hlSupported,
    repaint: repaintHighlights,
  } = useHighlights(L.lessonSlug, articleRef)

  // Only hints for features this lesson actually has. One shows at a time; the
  // rest wait for another visit.
  // What the contents lists show. In study mode the rail is the top-level
  // navigation and this becomes "sections in this step" — listing sections that
  // are hidden meant two navigations stacked, one of them describing a page
  // that was not on screen. Progress, resume and the stage set deliberately
  // keep using the full toc: what you navigate is not what you have done.
  const tocForNav = useMemo(() => {
    if (!activeStage) return toc
    return toc.filter((t) => {
      const s = stageForSection(t.id)
      return !s || s === activeStage
    })
  }, [activeStage, toc])

  const mobileNavIndex = useMemo(() => {
    const idx = tocForNav.findIndex((t) => t.id === active)
    return idx >= 0 ? idx : 0
  }, [active, tocForNav])

  const availableHints = useMemo(() => {
    const out: HintKey[] = []
    if (L.notes?.length) out.push(HINT_KEYS.explain)
    // Only worth offering on a lesson long enough to be worth breaking up, and
    // pointless to advertise to somebody already using it.
    if (!study && stages.length > 2) out.push(HINT_KEYS.studyMode)
    // Only where the browser can actually paint them.
    if (hlSupported && !highlights.length) out.push(HINT_KEYS.highlight)
    if (stepSyncEnabled) out.push(HINT_KEYS.diagramSync)
    if (L.quiz?.length && !quizLocked) out.push(HINT_KEYS.quickCheck)
    return out
  }, [
    L.notes?.length,
    L.quiz?.length,
    highlights.length,
    hlSupported,
    quizLocked,
    stages.length,
    stepSyncEnabled,
    study,
  ])


  // Switching stage swaps most of the page out, so the old scroll position is
  // meaningless — turning study mode on halfway down a lesson would otherwise
  // strand you in blank space below content that no longer exists.
  //
  // The scroll has to happen AFTER React has committed the new stage, not
  // inside the state updater: the document collapses from every section to one,
  // and anything measuring during the old layout scrolls to a stale position.
  // An effect keyed on the stage is the only point where the measurement is
  // guaranteed to match what is on screen.
  const wantsScrollRef = useRef(false)

  useEffect(() => {
    if (!wantsScrollRef.current) return
    wantsScrollRef.current = false
    const el = articleRef.current
    if (el) scrollToElement(el)
  }, [study, stage])

  const toggleStudy = useCallback(() => {
    const next = !study
    setStudy(next)
    if (next) {
      markHintUsed(HINT_KEYS.studyMode)
      wantsScrollRef.current = true
    }
    try {
      window.localStorage.setItem(STUDY_PREF_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [study])

  const goStage = useCallback((next: StageId) => {
    wantsScrollRef.current = true
    setStage(next)
  }, [])

  const stepStudyStage = useCallback(
    (delta: number) => {
      if (!stage) return
      goStage(stepStage(stages, stage, delta))
    },
    [goStage, stage, stages]
  )



  const tocPct = useMemo(() => {
    if (isDone) return 100
    return lessonPercent
  }, [isDone, lessonPercent])

  // The single choke point for every jump: the contents rail, the resume strip
  // and #hash deep-links all land here. In study mode the target may be in a
  // stage that is currently hidden, so open that stage first — otherwise those
  // are dead clicks, and an inbound link to #quiz would appear to do nothing.
  const scrollToSection = useCallback(
    (id: string) => {
      const target = study ? stageForSection(id) : null
      if (target && target !== stage) {
        setStage(target)
        // Scroll after the section has been painted, not before.
        requestAnimationFrame(() => requestAnimationFrame(() => jumpTo(id)))
      } else {
        jumpTo(id)
      }
      setActive(id)
    },
    [stage, study]
  )

  useEffect(() => {
    saveLastLesson(L.code, L.slug)
  }, [L.code, L.slug])

  useEffect(() => {
    if (searchParams.get('mode') === 'papers' && practiceCount > 0) setMode('papers')
  }, [searchParams, practiceCount])

  // Inbound #hash, handled once.
  //
  // Guarded because scrollToSection now changes identity whenever the study
  // stage does, and without the guard this effect re-fired on every stage
  // change and dragged the reader back to the original anchor — which also
  // reset the stage, since jumping to a section opens the stage that owns it.
  // Navigating away from a deep link has to be allowed to stick.
  const hashHandledRef = useRef(false)
  useEffect(() => {
    if (mode !== 'learn' || typeof window === 'undefined') return
    if (hashHandledRef.current) return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    hashHandledRef.current = true
    const t = window.setTimeout(() => scrollToSection(hash), 150)
    return () => window.clearTimeout(t)
  }, [mode, scrollToSection])

  // (A scroll listener used to compute a percentage here. Progress now comes
  // from useLessonProgress — sections worked through, not scroll depth.)

  useEffect(() => {
    if (mode !== 'learn') return
    const obs = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    toc.forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [mode, toc])

  const topicLink = (topic: { slug: string; n: string; t: string }) => {
    const base = lessonTopicHref(L.code, topic, basePath)
    return paperQuery ? `${base}?paper=${encodeURIComponent(paperQuery)}` : base
  }

  return (
    <main
      className="lesson-page"
      data-screen-label={`Lesson — ${L.name}`}
      // Both names: --acc-lesson is what the existing lesson CSS reads, --hub-acc
      // is what the shared course components (hero wash, section rules, hints,
      // save prompt) read. Publishing only the first meant every subject's
      // accent silently fell back to ink green.
      style={{ '--acc-lesson': acc, '--hub-acc': acc } as React.CSSProperties}
    >
      <ReadingProgress accent={acc} />
      <div className="pg">
        <Breadcrumb
          items={[
            coursesCrumb,
            {
              label: `${L.sub} ${L.code}`,
              href: paperQuery
                ? `${basePath}/${L.code}?paper=${encodeURIComponent(paperQuery)}`
                : `${basePath}/${L.code}`,
            },
            { label: L.name },
          ]}
        />
      </div>

      <div className="lesson-stage" aria-hidden />
      <header className="lesson-hero pg">
        <div className="lesson-hero-main">
          {/* One line, ordered by what a student actually asks: which point is
              this, in what, how long. Separators instead of four competing
              pills — the old chip row wrapped to two lines on a phone. */}
          <div className="lesson-metaline mono">
            <span className="lesson-metaline-code">{L.point}</span>
            <span className="lesson-metaline-sep" aria-hidden>/</span>
            <span>{L.sub}</span>
            {L.mins ? (
              <>
                <span className="lesson-metaline-sep" aria-hidden>/</span>
                <span>{L.mins} min read</span>
              </>
            ) : null}
            {L.tag === 'premium' || L.tag === 'pilot' ? (
              <span className="lesson-metaline-tag">{(L.tag || 'topic').toUpperCase()}</span>
            ) : null}
          </div>
          <h1 className="h-display lesson-title">
            {L.heroEm ? (
              <>
                {L.heroPre} <em>{L.heroEm}</em>
              </>
            ) : (
              L.name
            )}
          </h1>
          <div className="lead lesson-intro">
            <CourseRichText content={L.intro} variant="prose" className="lesson-intro-rich" breakAnywhere={false} />
          </div>
          {L.objectives?.length ? (
            <div className="lesson-objlist">
              <p className="micro objlist-kicker">
                BY THE END, YOU CAN…
              </p>
              <MarginNote className="lesson-obj-note">exam checklist — tick these off</MarginNote>
              <ol>
                {L.objectives.map((o, i) => (
                  <li key={i}>
                    <span className="obj-n mono">{i + 1}</span>
                    <CourseRichText content={o} variant="inline" className="lesson-obj-text" breakAnywhere={false} />
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
        <aside className="lesson-hero-side">
          <div className="sheet lesson-sheet">
            <div className="tally">{L.point}</div>
            <div className="sheet-head">
              <span>
                {L.code} · {L.sub.toUpperCase()}
              </span>
              <span>≈ {L.mins} MIN</span>
            </div>
            <p className="lesson-sheet-name serif">{L.name}</p>
            <div className="lesson-sheet-rules" aria-hidden>
              <div className="sheet-line" />
              <div className="sheet-line" />
            </div>
            <p className="micro lesson-sheet-meta">{L.papers}</p>
            {locked ? (
              <Link className="btn-primary btn-block" href="/pricing">
                {signedIn === false
                  ? 'Create free account →'
                  : 'Unlock practice & diagrams →'}
              </Link>
            ) : boardStudyVisit && markHrefOverride ? (
              <Link
                className="btn-primary btn-block"
                href={markHrefOverride}
                onClick={() =>
                  trackFunnelEvent('mark_cta_clicked', {
                    source: 'study_path_sheet',
                    board: studyBoard,
                    subject: L.code,
                  })
                }
              >
                {markCtaLabel ? `${markCtaLabel} →` : 'Mark this unit →'}
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary btn-block"
                disabled={accessPending}
                onClick={() =>
                  practiceCount > 1 ? setLessonMode('papers') : scrollToSection('practice')
                }
              >
                {practiceCount > 1
                  ? `Past papers (${practiceCount}) →`
                  : 'Practise & mark this topic →'}
              </button>
            )}
            {hasVisual && !diagramsLocked ? (
              <button
                type="button"
                className="btn-ghost sm btn-block btn-block-gap"
                onClick={() => scrollToSection('visual')}
              >
                Jump to the live diagram
              </button>
            ) : null}
            <p className="greennote sheet-footnote">
              {studyBoard === 'edexcel'
                ? 'Edexcel dialect · method & accuracy marks ✓'
                : studyBoard === 'oxfordaqa'
                  ? 'OxfordAQA dialect · board-style marks ✓'
                  : studyBoard === 'aqa'
                    ? 'AQA dialect · method & accuracy marks ✓'
                    : studyBoard === 'ap'
                      ? 'AP FRQ dialect · scoring-guideline points ✓'
                      : 'marked against the real scheme ✓'}
            </p>
          </div>
        </aside>
      </header>

      <div className="lesson-modebar-wrap">
        <div className="pg lesson-modebar">
          <div className="mode-tabs" role="tablist" aria-label="Lesson view">
            <button
              type="button"
              role="tab"
              id="lesson-tab-learn"
              aria-selected={mode === 'learn'}
              aria-controls="lesson-panel-learn"
              className={`mode-tab${mode === 'learn' ? ' on' : ''}`}
              onClick={() => setLessonMode('learn')}
            >
              Learn <span className="mode-sub">visuals + notes</span>
            </button>
            <button
              type="button"
              role="tab"
              id="lesson-tab-papers"
              aria-selected={mode === 'papers'}
              aria-controls="lesson-panel-papers"
              className={`mode-tab${mode === 'papers' ? ' on' : ''}`}
              onClick={() => setLessonMode('papers')}
            >
              Past papers
              {practiceCount > 1 ? (
                <span className="mode-count mono">{practiceCount}</span>
              ) : null}
              <span className="mode-sub">
                {practiceCount > 1 ? 'questions' : 'try questions'}
              </span>
            </button>
          </div>
          <div className="mode-right">
            {mode === 'learn' && stages.length > 1 ? (
              <div className="ink-toggle study-toggle">
                <span className="micro" id="lesson-study-label">
                  STUDY MODE
                </span>
                <span id="lesson-study-hint" className="sr-only">
                  Walk the lesson one step at a time instead of one long page
                </span>
                <SegmentedControl
                  className="ink-seg"
                  optionClassName="ink-seg-opt"
                  aria-labelledby="lesson-study-label"
                  aria-describedby="lesson-study-hint"
                  value={study ? 'on' : 'off'}
                  onChange={(v) => {
                    if ((v === 'on') !== study) toggleStudy()
                  }}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'on', label: 'ON' },
                  ]}
                />
              </div>
            ) : null}
            {mode === 'learn' ? (
              <div className="ink-toggle">
                <span className="micro" id="lesson-simpler-label">
                  EXPLAIN SIMPLER
                </span>
                <SegmentedControl
                  className="ink-seg"
                  optionClassName="ink-seg-opt"
                  aria-labelledby="lesson-simpler-label"
                  value={simpler ? 'on' : 'off'}
                  onChange={(v) => setSimpler(v === 'on')}
                  options={[
                    { value: 'off', label: 'OFF' },
                    { value: 'on', label: 'ON' },
                  ]}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mode === 'learn' && tocForNav.length > 0 ? (
        <nav className="lesson-mobile-jump pg" aria-label="On this page">
          {/* Compact stand-in for the sidebar progress ring (hidden on mobile). */}
          <span
            className={`lesson-mobile-jump-progress mono${isDone ? ' done' : ''}`}
            aria-label={isDone ? 'Topic complete' : `Lesson progress: ${tocPct}%`}
          >
            {isDone ? '✓ done' : `${tocPct}%`}
          </span>
          {/* Section X of Y — replaces the horizontal chip rail of every TOC entry (CO-02). */}
          <div className="lesson-mobile-jump-stepper">
            <button
              type="button"
              className="lesson-mobile-jump-step"
              disabled={mobileNavIndex <= 0}
              aria-label="Previous section"
              onClick={() => {
                const prev = tocForNav[mobileNavIndex - 1]
                if (prev) scrollToSection(prev.id)
              }}
            >
              ‹
            </button>
            <label className="lesson-mobile-jump-select-wrap">
              <span className="sr-only">
                Section {mobileNavIndex + 1} of {tocForNav.length}
              </span>
              <select
                className="lesson-mobile-jump-select"
                value={tocForNav[mobileNavIndex]?.id ?? tocForNav[0]!.id}
                onChange={(e) => scrollToSection(e.target.value)}
                aria-label={`Section ${mobileNavIndex + 1} of ${tocForNav.length}`}
              >
                {tocForNav.map((tt, i) => (
                  <option key={tt.id} value={tt.id}>
                    {i + 1}/{tocForNav.length} · {tt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="lesson-mobile-jump-step"
              disabled={mobileNavIndex >= tocForNav.length - 1}
              aria-label="Next section"
              onClick={() => {
                const next = tocForNav[mobileNavIndex + 1]
                if (next) scrollToSection(next.id)
              }}
            >
              ›
            </button>
          </div>
        </nav>
      ) : null}

      {mode === 'papers' ? (
        <div
          className="pg lesson-papers"
          role="tabpanel"
          id="lesson-panel-papers"
          aria-labelledby="lesson-tab-papers"
        >
          <SecHead
            k="·"
            title="Past paper questions"
            sub={
              boardStudyVisit
                ? practiceCount > 1
                  ? `${practiceCount} practice questions — mark each in your board dialect after you attempt on paper.`
                  : 'Attempt on paper, then mark in your board dialect.'
                : practiceCount > 1
                  ? `${practiceCount} real Cambridge questions for this topic — mark each one against the official scheme.`
                  : 'A real Cambridge question for this topic — mark it against the official scheme.'
            }
          />
          {locked ? (
            <LessonUpsell feature="practice" signedIn={signedIn} />
          ) : (
            <PracticeSection
              lesson={L}
              big
              returnPath={lessonReturnPath}
              markHrefOverride={markHrefOverride}
              markCtaLabel={markCtaLabel}
            />
          )}
          <div className="lesson-end lesson-papers-end">
            <LessonEndBlock
              isDone={isDone}
              celebrate={celebrate}
              onComplete={handleComplete}
              prev={prev}
              next={next}
              topicLink={topicLink}
              extra={
                <button type="button" className="btn-ghost sm lesson-papers-back" onClick={() => setLessonMode('learn')}>
                  ← Back to lesson notes
                </button>
              }
            />
          </div>
        </div>
      ) : (
        <div
          className="lesson-layout pg"
          role="tabpanel"
          id="lesson-panel-learn"
          aria-labelledby="lesson-tab-learn"
        >
          <aside className="lesson-toc">
            <p className="micro toc-kicker">ON THIS PAGE</p>
            <nav>
              {tocForNav.map((tt) => {
                // Numbered against the whole lesson, so a section keeps the
                // same number whichever stage is on screen.
                const i = toc.findIndex((t) => t.id === tt.id)
                return (
                <button
                  key={tt.id}
                  type="button"
                  className={`toc-link${active === tt.id ? ' on' : ''}${
                    readIds.has(tt.id) ? ' read' : ''
                  }`}
                  data-stage={stageForSection(tt.id) ?? undefined}
                  aria-current={active === tt.id ? 'true' : undefined}
                  onClick={() => scrollToSection(tt.id)}
                >
                  {/* The number becomes a tick once the section is worked
                      through, so the rail shows what is left rather than just
                      where you are. */}
                  <span className="toc-num mono" aria-hidden>
                    {readIds.has(tt.id) ? '✓' : String(i + 1).padStart(2, '0')}
                  </span>
                  {tt.label}
                  {readIds.has(tt.id) ? <span className="sr-only"> — done</span> : null}
                </button>
                )
              })}
            </nav>
            <div className="toc-progress card">
              <Ring pct={tocPct} size={40} stroke={4} color={acc} />
              <span className="body-2 toc-progress-label">
                {isDone ? 'Topic complete' : 'Keep going'}
              </span>
            </div>
            {signedIn === false ? (
              <p className="micro toc-sync-hint">
                <Link className="hub-sync-link" href={buildSignInHref(pathname)}>
                  Sign in
                </Link>{' '}
                to sync progress
              </p>
            ) : null}
          </aside>

          <article
            className="lesson-article"
            ref={articleRef}
            data-study-stage={activeStage ?? undefined}
          >
            {simpler ? (
              <div className="simpler-banner">
                <span className="hand">plain-English mode on — no jargon, no fear ✎</span>
              </div>
            ) : null}
            {L.outline ? (
              <div className="outline-banner card">
                <span className="outline-tag mono">OUTLINE TOPIC</span>
                <p className="body-2">
                  The full premium walkthrough for this point is being written. The syllabus
                  alignment is set —{' '}
                  <b className="text-main">practise a real question now</b> and mark it
                  against the official scheme.
                </p>
              </div>
            ) : null}

            <ResumeStrip
              state={resume}
              onJump={scrollToSection}
              practiceHref={quizPracticeHref}
            />

            <FeatureHint hintKey={HINT_KEYS.studyMode} available={availableHints} />
            <FeatureHint hintKey={HINT_KEYS.highlight} available={availableHints} />

            {activeStage ? (
              <StudyStages
                stages={stages}
                active={activeStage}
                doneStages={doneStages}
                onSelect={goStage}
              />
            ) : null}

            {L.simple ? (
              <section id="simple" className="lsec" data-stage={stageForSection('simple') ?? undefined}>
                <SecHead
                  k="01"
                  title="In simple terms"
                  sub="A friendly intro before the formal notes — no formulas yet."
                />
                {L.simple.title ? (
                  <p className="simple-kicker overline mono">{L.simple.title}</p>
                ) : null}
                <div className="simple-lead card card-pad">
                  <div className="serif simple-lead-text">
                    <CourseRichText content={L.simple.lead} variant="prose" />
                  </div>
                </div>
                {L.simple.analogy ? (
                  <div className="analogy">
                    <span className="analogy-tag mono">THINK OF IT LIKE…</span>
                    <div className="body-2">
                      <CourseRichText content={L.simple.analogy} variant="prose" />
                    </div>
                  </div>
                ) : null}
                {L.simple.steps?.length ? (
                  <ol className="simple-steps">
                    {L.simple.steps.map((step, i) => (
                      <li key={i} className="simple-step">
                        <span className="obj-n mono">{i + 1}</span>
                        <CourseRichText content={step} variant="prose" className="simple-step-rich" />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            ) : null}

            {L.subtopics?.length ? (
              <section id="syllabus" className="lsec" data-stage={stageForSection('syllabus') ?? undefined}>
                <SecHead
                  k="·"
                  title="What this topic covers"
                  sub="The official Cambridge syllabus points this lesson works through."
                />
                <ol className="subtopics">
                  {L.subtopics.map((st, i) => (
                    <li key={i} className="subtopic card">
                      <span className="subtopic-code mono">{st.code ?? i + 1}</span>
                      <div className="subtopic-body">
                        <p className="subtopic-title serif">
                          <CourseRichText content={st.title} variant="inline" breakAnywhere={false} />
                        </p>
                        {st.detail ? (
                          <p className="body-2 subtopic-detail">
                            <CourseRichText content={st.detail} variant="inline" breakAnywhere={false} />
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {criterionLadder ? (
              <section id="criteria" className="lsec" data-stage={stageForSection('criteria') ?? undefined}>
                <SecHead
                  k="·"
                  title="How it’s marked"
                  sub="The official criteria for this component — descriptors word for word, not paraphrased."
                />
                <CriterionLadder data={criterionLadder} />
              </section>
            ) : null}

            <div
              className="lesson-sync-region"
              data-sync={stepSyncEnabled ? 'on' : 'off'}
            >
            {L.hasDiagram ? (
              <section id="visual" className="lsec" data-stage={stageForSection('visual') ?? undefined}>
                <SecHead
                  k="02"
                  title="Explore the concept"
                  sub={
                    L.lessonSlug === 'paper-5-planning-and-analysis'
                      ? 'Follow the WAL walkthrough — plot error bars, LOBF, WAL, then read off gradient uncertainty.'
                      : L.interactiveEmbed
                        ? 'Use the live diagram, PhET or GeoGebra sim, and synced steps — play it, drag controls, or tap a step.'
                        : 'Use the live diagram and synced steps — play it or tap a step card to walk through.'
                  }
                />
                <FeatureHint hintKey={HINT_KEYS.diagramSync} available={availableHints} />
                {diagramsLocked ? (
                  <LessonUpsell feature="diagrams" signedIn={signedIn} />
                ) : (
                  <div className="visual-stack">
                    <CourseLessonDiagramShell
                      lessonSlug={L.lessonSlug}
                      template={L.template}
                      diagramSpec={L.diagramSpec}
                      interactiveEmbed={L.interactiveEmbed}
                      steps={
                        L.steps?.length
                          ? L.steps
                          : [{ n: 1, title: 'Explore', body: L.intro || 'Use the interactive visual below.' }]
                      }
                      step={step}
                      setStep={setStep}
                    />
                  </div>
                )}
              </section>
            ) : null}

            {L.figures?.length ? (
              <section id="figures" className="lsec" data-stage={stageForSection('figures') ?? undefined}>
                <SecHead
                  k="·"
                  title="Figures"
                  sub="Diagrams, charts and structures for this topic."
                />
                <div className="lesson-figure-stack">
                  {L.figures.map((f, i) => (
                    <LessonFigureBlock key={`${f.kind}-${i}`} figure={f} />
                  ))}
                </div>
              </section>
            ) : null}

            {L.formulas?.length ? (
              <section id="formulas" className="lsec" data-stage={stageForSection('formulas') ?? undefined}>
                <SecHead
                  k="03"
                  title="Key formulas"
                  sub="Tap any symbol to reveal exactly what it means and its units."
                />
                <div className="formula-row">
                  {L.formulas.map((f, i) => (
                    <FormulaCard key={i} f={f} />
                  ))}
                </div>
              </section>
            ) : null}

            {L.comparisonTable ? (
              <section id="compare" className="lsec" data-stage={stageForSection('compare') ?? undefined}>
                <SecHead
                  k="·"
                  title={L.comparisonTable.title}
                  sub="Compare key properties side by side — ideal for exam contrasts."
                />
                <LessonComparisonTable table={L.comparisonTable} />
              </section>
            ) : null}


            {L.notes?.length ? (
              <section id="notes" className="lsec" data-stage={stageForSection('notes') ?? undefined}>
                <SecHead
                  k="04"
                  title="Full topic notes"
                  sub={
                    simpler
                      ? 'Plain-English mode — the exam rigour is one toggle away.'
                      : 'Formal explanation with the rigour you need for the exam.'
                  }
                />
                <FeatureHint hintKey={HINT_KEYS.explain} available={availableHints} />
                <div className="notes-body">
                  {L.notes.map((n, i) => (
                    <div key={i} className="note-block" ref={registerNoteBlock(i)}>
                      <h3 className="note-h serif">{n.h}</h3>
                      {(simpler && L.simple?.simplerByHeading?.[n.h]
                        ? L.simple.simplerByHeading[n.h]
                        : n.p) ? (
                        <div className="body-2 note-p">
                          <CourseRichText
                            content={
                              simpler && L.simple?.simplerByHeading?.[n.h]
                                ? L.simple.simplerByHeading[n.h]
                                : n.p
                            }
                            variant="prose"
                          />
                        </div>
                      ) : null}
                      {/* Key points and the exam tip stay put in simpler mode.
                          Hiding them stripped exam guidance from exactly the
                          student who had just said they were struggling. */}
                      {n.bullets?.length ? (
                        <ul className="note-bullets">
                          {n.bullets.map((b, bi) => (
                            <li key={bi} className="body-2">
                              <CourseRichText content={b} variant="prose" />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {n.tip ? (
                        <div className="note-tip">
                          <span className="note-tip-tag mono">EXAM TIP</span>
                          <div className="body-2">
                            <CourseRichText content={n.tip} variant="prose" />
                          </div>
                        </div>
                      ) : null}
                      <ExplainBlock
                        subjectCode={L.code}
                        lessonSlug={L.lessonSlug}
                        block={n}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            </div>

            {L.worked?.length ? (
              <section id="worked" className="lsec" data-stage={stageForSection('worked') ?? undefined}>
                <SecHead
                  k="05"
                  title="Worked examples"
                  sub="See the formulas applied — reveal one step at a time, like the exam."
                />
                <MarginNote className="lesson-worked-note">reveal slowly — mark each step</MarginNote>
                <div className="worked-stack">
                  {L.worked.map((w, i) => (
                    <Worked key={i} w={w} idx={i} />
                  ))}
                </div>
              </section>
            ) : null}

            {L.conceptMap && !premiumHidden ? (
              <section id="cmap" className="lsec" data-stage={stageForSection('cmap') ?? undefined}>
                <SecHead
                  k="06"
                  title="How it all connects"
                  sub="The big idea sits in the middle — tap a linked idea to explore the link."
                />
                <ConceptMapBlock lesson={L} />
              </section>
            ) : null}

            {L.glossary?.length ? (
              <section id="glossary" className="lsec" data-stage={stageForSection('glossary') ?? undefined}>
                <SecHead
                  k="07"
                  title="Glossary"
                  sub="Try to recall each definition before you reveal it."
                />
                <Glossary items={L.glossary} />
              </section>
            ) : null}

            {L.quiz?.length && !quizLocked ? (
              <section id="quiz" className="lsec" data-stage={stageForSection('quiz') ?? undefined}>
                <SecHead
                  k="08"
                  title="Quick check"
                  sub="Write your answer first, then compare it with the model one — the gap is what you would have lost."
                />
                <FeatureHint hintKey={HINT_KEYS.quickCheck} available={availableHints} />
                <QuickCheck
                  onComplete={() => markInteracted('quiz')}
                  items={L.quiz}
                  storageKey={L.lessonSlug}
                  practiceHref={quizPracticeHref}
                  practiceRef={quizPractice?.ref}
                  subjectCode={L.code}
                  lessonSlug={L.lessonSlug}
                  returnPath={lessonReturnPath}
                />
              </section>
            ) : null}

            {L.flashcards?.length && !premiumHidden ? (
              <section id="cards" className="lsec" data-stage={stageForSection('cards') ?? undefined}>
                <SecHead
                  k="09"
                  title="Revision flashcards"
                  sub="Flip the card. Test yourself before the exam."
                />
                <Flashcards cards={L.flashcards} />
              </section>
            ) : null}

            {L.takeaways?.length ? (
              <section id="takeaways" className="lsec" data-stage={stageForSection('takeaways') ?? undefined}>
                <SecHead
                  k="10"
                  title="Key takeaways"
                  sub="Review these before you close the topic — retrieval beats re-reading."
                />
                <MarginNote className="lesson-takeaway-note">close the tab only after these stick</MarginNote>
                <ul className="takeaways">
                  {L.takeaways.map((t, i) => (
                    <li key={i}>
                      <span className="take-check mono" aria-hidden>
                        M1
                      </span>
                      <CourseRichText content={t} variant="prose" className="body-2 takeaway-rich" breakAnywhere={false} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {L.practice ? (
              <section id="practice" className="lsec" data-stage={stageForSection('practice') ?? undefined}>
                <SecHead
                  k="11"
                  title="Practice — then mark it"
                  sub={
                    boardStudyVisit
                      ? 'The whole point: attempt on paper, then mark in your board dialect.'
                      : 'The whole point: a real Cambridge question, marked mark-by-mark.'
                  }
                />
                {locked ? (
                  <LessonUpsell feature="practice" signedIn={signedIn} />
                ) : (
                  <PracticeSection
                    lesson={L}
                    returnPath={lessonReturnPath}
                    markHrefOverride={markHrefOverride}
                    markCtaLabel={markCtaLabel}
                  />
                )}
              </section>
            ) : null}

            {L.resources?.length ? (
              <section id="resources" className="lsec" data-stage={stageForSection('resources') ?? undefined}>
                <SecHead
                  k="·"
                  title="Extra simulations & links"
                  sub="PhET, GeoGebra and other curated tools — open in a new tab."
                />
                <ul className="lesson-resources">
                  {L.resources.map((r) => (
                    <li key={r.href}>
                      <a
                        className="lesson-resource-link"
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.label}
                        <span className="lesson-resource-go">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {L.faqs?.length ? (
              <section id="faqs" className="lsec" data-stage={stageForSection('faqs') ?? undefined}>
                <SecHead k="·" title="Frequently asked" />
                <div className="faqs">
                  {L.faqs.map((f, i) => (
                    <Faq key={i} f={f} />
                  ))}
                </div>
              </section>
            ) : null}

            <LessonMasteryBand
              subjectCode={L.code}
              topicCode={L.point}
              signedIn={signedIn}
            />

            {L.practiceQuestions?.length || L.practice ? (
              <section id="checkpoint" className="lsec" data-stage={stageForSection('checkpoint') ?? undefined}>
                <SecHead
                  k="✓"
                  title="Checkpoint"
                  sub="One marked question is worth ten re-reads — close the loop before you move on."
                />
                <LessonCheckpoint
                  lesson={L}
                  returnPath={lessonReturnPath}
                  markHrefOverride={markHrefOverride}
                  markCtaLabel={markCtaLabel}
                />
              </section>
            ) : null}

            <HighlightRecap list={highlights} onJump={scrollToSection} />

            {activeStage ? (
              <StudyStageFooter
                stages={stages}
                active={activeStage}
                onStep={stepStudyStage}
              />
            ) : null}

            <div className="lesson-end">
            <LessonEndBlock
              isDone={isDone}
              celebrate={celebrate}
              onComplete={handleComplete}
              prev={prev}
              next={next}
              topicLink={topicLink}
            />
              {related.length > 0 ? (
                <div className="related">
                  <p className="micro related-kicker">
                    KEEP GOING · MORE {L.code} TOPICS
                  </p>
                  <div className="related-grid">
                    {related.map((r) => (
                      <Link key={r.n} className="related-card" href={topicLink(r)}>
                        <span className="related-n mono">{r.n}</span>
                        <span className="related-t">{r.t}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {community}
          </article>
        </div>
      )}

      <Highlighter
        list={highlights}
        setList={setHighlights}
        supported={hlSupported}
        repaint={repaintHighlights}
        rootRef={articleRef}
        repaintKey={`${activeStage ?? 'doc'}|${simpler}|${mode}`}
      />
    </main>
  )
}
