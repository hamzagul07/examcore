'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import {
  DEFAULT_READING_PREFS,
  READING_FONT_HINT,
  isDefaultReading,
  readReadingPrefs,
  writeReadingPrefs,
  type ReadingFont,
  type ReadingPrefs,
  type ReadingSize,
} from '@/lib/courses/reading-prefs'
import { ExplainBlock } from '@/components/courses/ExplainBlock'
import { FeatureHint, markHintUsed } from '@/components/courses/FeatureHint'
import { ResumeStrip } from '@/components/courses/ResumeStrip'
import { RoadmapChip } from '@/components/plan/RoadmapChip'
import { Highlighter, useHighlights } from '@/components/courses/Highlighter'
import { HighlightRecap } from '@/components/courses/HighlightRecap'
import { stagesPresent, stageForSection, STUDY_PREF_KEY } from '@/lib/courses/study-mode'
import {
  nextScrollTop,
  scrollFrom,
  studyScrollDecision,
  type PendingTarget,
} from '@/lib/courses/study-scroll'
import {
  VISUAL_NOTES_PREF_KEY,
  buildNoteSketch,
} from '@/lib/courses/visual-notes'
import { NoteSketchCard } from '@/components/courses/margin-notes/NoteSketchCard'
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
import { INTERACTIVE_DIAGRAMS_FREE, QUICK_CHECK_FREE, hasScholarFeatures } from '@/lib/billing/features'
import {
  jumpTo,
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
import { TeachBack } from './TeachBack'
import { bloomLabelForSection } from '@/lib/courses/bloom'

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
  /**
   * Board study query (?board&unit/subject), read from location.search by the
   * client parent AFTER mount — never from useSearchParams, which would bail
   * the whole prerendered route into client-side rendering.
   */
  studyQuery?: { board: string | null; unit: string | null; subject: string | null } | null
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
  studyQuery,
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
  // Scholar and above. The course library is sold as a Scholar feature and shown
  // as excluded on the Starter card, so `!== 'free'` would have handed the whole
  // library to the $5.99 tier. `access` is undefined until the probe resolves,
  // which accessPending below already covers.
  const locked = access !== undefined && !hasScholarFeatures(access)
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
  /** Experiment: dual-code notes with a sketch panel beside the prose. */
  const [visualNotes, setVisualNotes] = useState(false)
  // Reading typography — restored after mount so the server and the first
  // client render agree (the same pattern as the study-mode preference).
  const [readingPrefs, setReadingPrefs] = useState<ReadingPrefs>(DEFAULT_READING_PREFS)
  useEffect(() => {
    // This device's choice first, so the page settles without a swap; then,
    // for a signed-in reader, the choice saved on the account — a phone and
    // a laptop should agree. The auth cookie is the cheap signed-in hint;
    // a stray 401 is simply ignored.
    setReadingPrefs(readReadingPrefs())
    let signedIn = false
    try {
      signedIn = document.cookie.includes('auth-token')
    } catch {
      /* ignore */
    }
    if (!signedIn) return
    const ctrl = new AbortController()
    fetch('/api/account/preferences', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { reading_prefs?: ReadingPrefs | null } | null) => {
        const saved = data?.reading_prefs
        if (!saved) return
        setReadingPrefs((cur) => {
          if (cur.font === saved.font && cur.size === saved.size && cur.air === saved.air) return cur
          writeReadingPrefs(saved)
          return saved
        })
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])
  const updateReading = useCallback((patch: Partial<ReadingPrefs>) => {
    setReadingPrefs((cur) => {
      const next = { ...cur, ...patch }
      writeReadingPrefs(next)
      try {
        if (document.cookie.includes('auth-token')) {
          void fetch('/api/account/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reading_prefs: next }),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])
  // The Aa menu is a native <details>; it closes on a click elsewhere or Escape.
  const readingMenuRef = useRef<HTMLDetailsElement | null>(null)
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const el = readingMenuRef.current
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false
    }
    const onKey = (e: KeyboardEvent) => {
      const el = readingMenuRef.current
      if (e.key === 'Escape' && el?.open) {
        el.open = false
        el.querySelector<HTMLElement>('summary')?.focus()
        // Escape closes the topmost thing only. The study-mode exit listens on
        // window, after this one; without this the same press also threw the
        // reader out of study mode.
        e.stopPropagation()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
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
      const params = new URLSearchParams(window.location.search)
      if (next === 'papers') params.set('mode', 'papers')
      else params.delete('mode')
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, router]
  )

  // Hand-off after the last quick check: the student has just produced answers,
  // which is the closest they get to attempting a real question without doing it.
  // Keep board/unit query on return so Edexcel study bridge survives /mark.
  const lessonReturnPath = useMemo(() => {
    const board = studyQuery?.board ?? null
    const unit = studyQuery?.unit ?? null
    const subject = studyQuery?.subject ?? null
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
  }, [pathname, studyQuery])

  const quizPractice = L.practiceQuestions?.[0] ?? L.practice ?? null
  // Deliberately NOT gated on `locked`. The href is a /mark deep link, and
  // marking has a free tier — this is the one moment a free reader has just
  // written three answers and is closest to attempting a real question. Hiding
  // the bridge from exactly that student would be backwards.
  const quizPracticeHref = quizPractice
    ? markHrefOverride ??
      appendMarkReturn(quizPractice.href, lessonReturnPath, L.point)
    : null
  const studyBoard = studyQuery?.board ?? undefined
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
        {
          id: 'teachback',
          label: 'Teach it back',
          on: Boolean(L.code && L.lessonSlug),
        },
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
  // Prefer unfinished retrieval (quiz → teach-back → cards) over rereading.
  const resume = useMemo(() => {
    const retrievalIds = [
      L.quiz?.length && !quizLocked ? 'quiz' : null,
      L.code && L.lessonSlug ? 'teachback' : null,
      L.flashcards?.length && !premiumHidden ? 'cards' : null,
    ].filter((id): id is string => !!id)
    return resumeState(toc, readIds, { retrievalIds })
  }, [
    L.quiz?.length,
    L.code,
    L.lessonSlug,
    L.flashcards?.length,
    quizLocked,
    premiumHidden,
    readIds,
    toc,
  ])

  useEffect(() => {
    setActive((prev) => (toc.some((t) => t.id === prev) ? prev : toc[0]?.id ?? ''))
  }, [toc])

  const activeLabel = useMemo(() => {
    const i = toc.findIndex((t) => t.id === active)
    return i >= 0 ? `${String(i + 1).padStart(2, '0')} · ${toc[i].label}` : null
  }, [toc, active])

  // Chapter numbers come from the contents list, so the kicker on a section
  // always matches the number the reader clicked in the TOC. They used to be
  // hard-coded per section and drifted ("04 Key formulas" in the TOC, "03" on
  // the page) whenever a section was absent.
  const secK = useCallback(
    (id: string) => {
      const i = toc.findIndex((t) => t.id === id)
      return i >= 0 ? String(i + 1).padStart(2, '0') : '·'
    },
    [toc]
  )

  // ── Study mode ────────────────────────────────────────────────────────────
  // Immersive full-screen reading of the SAME lesson as OFF — one continuous
  // scroll, no wizard, no stage chrome. Served HTML stays identical for SEO.
  const articleRef = useRef<HTMLElement | null>(null)
  const [study, setStudy] = useState(false)

  const tocIds = useMemo(() => toc.map((t) => t.id), [toc])
  const stages = useMemo(() => stagesPresent(tocIds), [tocIds])

  useEffect(() => {
    try {
      const pref = window.localStorage.getItem(STUDY_PREF_KEY)
      // Study mode is opt-in everywhere. Phones used to default into the
      // overlay, which hid the title, the intro, the objectives, the site nav
      // and the Past papers tab behind an OFF pill the reader had to discover
      // — the first thing most students saw was "01 In simple terms" with no
      // way back. The page opens as a page; immersion is one tap away.
      setStudy(pref === '1')
    } catch {
      /* private mode: document view is the safe default */
    }
  }, [])

  // Tell the document shell (site nav) study is open — whole-screen focus.
  useEffect(() => {
    document.documentElement.dataset.lessonStudy = study ? 'on' : 'off'
    return () => {
      delete document.documentElement.dataset.lessonStudy
    }
  }, [study])

  // The sticky bar's real height, published for everything stacked beneath
  // it (the contents rail, the phone section stepper, jump offsets). It was
  // a hard-coded 52px; on a phone the bar wraps and the stepper that exists
  // for phones sat fully behind it.
  const modebarRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const bar = modebarRef.current
    const page = bar?.closest<HTMLElement>('.lesson-page')
    if (!bar || !page || typeof ResizeObserver === 'undefined') return
    const publish = () => {
      page.style.setProperty('--lesson-modebar-height', `${Math.round(bar.getBoundingClientRect().height)}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    try {
      setVisualNotes(window.localStorage.getItem(VISUAL_NOTES_PREF_KEY) === '1')
    } catch {
      /* private mode */
    }
  }, [])

  const toggleVisualNotes = useCallback(() => {
    setVisualNotes((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(VISUAL_NOTES_PREF_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const lsecProps = useCallback(
    (id: string) => ({
      id,
      className: 'lsec',
      'data-stage': stageForSection(id) ?? undefined,
    }),
    []
  )

  // Highlights. Painted with the CSS Custom Highlight API rather than wrapped
  // in <mark>, so nothing is inserted into DOM that React owns — see
  // highlight-dom.ts for why that matters here.
  const {
    list: highlights,
    setList: setHighlights,
    supported: hlSupported,
    repaint: repaintHighlights,
  } = useHighlights(L.lessonSlug, articleRef)

  const tocForNav = toc

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


  const toggleStudy = useCallback(() => {
    const next = !study
    setStudy(next)
    if (next) {
      markHintUsed(HINT_KEYS.studyMode)
      // Fixed overlay mounts next frame — start at the reading surface.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const root = document.querySelector<HTMLElement>(
            '.lesson-page[data-study="on"]'
          )
          if (!root) return
          root.scrollTop = 0
          // Study mode turns .lesson-page into a fixed, self-scrolling
          // overlay, so the DOCUMENT no longer scrolls — the overlay does.
          // Keyboard scrolling (arrows, PgUp/PgDn, Space) targets the
          // focused element's nearest scrollable ancestor, and after the
          // toggle focus is on the body, whose scroll container is the
          // document. That is why the mouse wheel worked and the arrow keys
          // did nothing. Putting focus on the overlay itself makes it the
          // keyboard scroll target. preventScroll keeps the reset above.
          root.focus({ preventScroll: true })
        })
      })
    }
    try {
      window.localStorage.setItem(STUDY_PREF_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [study])

  // Make the overlay the keyboard scroll target whenever study mode is ON —
  // not only when the toggle is clicked. Study can also come on at mount
  // (pref restored from localStorage, or the phone default), and on that path
  // nothing inside the overlay ever receives focus, so arrow keys and PgDn go
  // to the document, which no longer scrolls. Only claims focus from the body:
  // a student already typing in a box keeps it.
  useEffect(() => {
    if (!study) return
    const id = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>('.lesson-page[data-study="on"]')
      if (!root) return
      const active = document.activeElement
      if (active && active !== document.body && root.contains(active)) return
      root.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(id)
  }, [study])

  // Scroll keys move the overlay. Focus alone is not enough: WebKit drops
  // rapid arrow taps even with the overlay focused, and focus falls to <body>
  // whenever the focused element unmounts (a "reveal" button, a closed
  // dialog) — from there Firefox scrolls the overlay, WebKit nothing, and
  // Chromium whatever was last clicked. See lib/courses/study-scroll.ts for
  // the precedence (dialog → editable/widget → modifier → pane).
  //
  // The in-flight target lets held or rapid keys add up: each press measures
  // from where the last one is heading, not from wherever the smooth scroll
  // animation happens to be mid-way.
  const pendingScrollRef = useRef<PendingTarget | null>(null)
  const scrollOverlayForKey = useCallback((root: HTMLElement, e: KeyboardEvent) => {
    // Editable and key-owning controls keep their keys — the caret moves,
    // the quick-check arrows move between cards, the segmented radios
    // change selection, Space presses a button. A dialog keeps them all.
    const target = e.target instanceof Element ? e.target : null
    const intent = studyScrollDecision(e, target, document)
    if (!intent) return false
    const now = performance.now()
    const from = scrollFrom(pendingScrollRef.current, root.scrollTop, now)
    const modebar = root.querySelector<HTMLElement>('.lesson-modebar-wrap')
    const top = nextScrollTop(
      intent,
      {
        scrollTop: root.scrollTop,
        clientHeight: root.clientHeight,
        scrollHeight: root.scrollHeight,
        stickyTop: modebar?.offsetHeight ?? 0,
      },
      from
    )
    pendingScrollRef.current = { top, at: now }
    e.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
    return true
  }, [])

  const onOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!study) return
      scrollOverlayForKey(e.currentTarget, e.nativeEvent)
    },
    [study, scrollOverlayForKey]
  )

  // Focus lost to <body> (the focused element unmounted) — keys then never
  // reach the overlay's own handler. Take only those: a key whose target is
  // the body, with study on and no dialog open, and hand focus back to the
  // overlay so the next press is a normal one.
  useEffect(() => {
    if (!study) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== document.body && e.target !== document.documentElement) return
      const root = document.querySelector<HTMLElement>('.lesson-page[data-study="on"]')
      if (!root) return
      if (scrollOverlayForKey(root, e)) root.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [study, scrollOverlayForKey])

  // Esc exits immersion — but never while typing in an input / teach-back box.
  useEffect(() => {
    if (!study) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target
      if (
        t instanceof HTMLElement &&
        (t.tagName === 'TEXTAREA' ||
          t.tagName === 'INPUT' ||
          t.isContentEditable ||
          t.closest('[role="textbox"]'))
      ) {
        return
      }
      toggleStudy()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [study, toggleStudy])

  const tocPct = useMemo(() => {
    if (isDone) return 100
    return lessonPercent
  }, [isDone, lessonPercent])

  const scrollToSection = useCallback((id: string) => {
    jumpTo(id)
    setActive(id)
  }, [])

  useEffect(() => {
    saveLastLesson(L.code, L.slug)
  }, [L.code, L.slug])

  useEffect(() => {
    // Initial-load deep link only (?mode=papers). Read off location so the
    // page can prerender; later toggles go through setLessonMode directly.
    const mode = new URLSearchParams(window.location.search).get('mode')
    if (mode === 'papers' && practiceCount > 0) setMode('papers')
  }, [practiceCount])

  // Inbound #hash, handled once per lesson mount.
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

  // Stable key so the effect deps never change length under HMR.
  const tocObserveKey = tocIds.join('|')
  useEffect(() => {
    if (mode !== 'learn') return
    // Study immersion scrolls inside .lesson-page, not the window.
    const root = study
      ? document.querySelector<HTMLElement>('.lesson-page[data-study="on"]')
      : null
    const obs = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { root: root ?? null, rootMargin: '-30% 0px -60% 0px' }
    )
    for (const id of tocObserveKey.split('|')) {
      if (!id) continue
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [mode, tocObserveKey, study])

  const topicLink = (topic: { slug: string; n: string; t: string }) => {
    const base = lessonTopicHref(L.code, topic, basePath)
    return paperQuery ? `${base}?paper=${encodeURIComponent(paperQuery)}` : base
  }

  return (
    <main
      className="lesson-page"
      data-study={study ? 'on' : 'off'}
      // Focusable (not tabbable) so it can be the keyboard scroll target in
      // study mode — see toggleStudy. Off-mode it is inert: focus() on it is
      // only ever called when the overlay is on, and the key handler bails.
      tabIndex={-1}
      onKeyDown={onOverlayKeyDown}
      data-visual-notes={visualNotes ? 'on' : 'off'}
      data-reading-font={readingPrefs.font}
      data-reading-size={readingPrefs.size}
      data-reading-air={readingPrefs.air ? 'on' : 'off'}
      data-screen-label={`Lesson — ${L.name}`}
      // Both names: --acc-lesson is what the existing lesson CSS reads, --hub-acc
      // is what the shared course components (hero wash, section rules, hints,
      // save prompt) read. Publishing only the first meant every subject's
      // accent silently fell back to ink green.
      style={{ '--acc-lesson': acc, '--hub-acc': acc } as React.CSSProperties}
    >
      <ReadingProgress accent={acc} />
      <div className="pg lesson-crumb">
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

      <div className="lesson-modebar-wrap" ref={modebarRef}>
        <div className="pg lesson-modebar">
          <div className="mode-tabs" role="tablist" aria-label="Lesson view">
            {study ? (
              <p className="study-focus-title mono" id="lesson-study-focus">
                <span className="study-focus-k">STUDY</span>
                <span className="study-focus-name">{L.name}</span>
                <RoadmapChip variant="modebar" />
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
          {!study && mode === 'learn' ? (
            <p className="mode-folio mono" aria-hidden>
              <span className="mode-folio__topic">
                {L.point} · {L.name}
              </span>
              {activeLabel ? <span className="mode-folio__section">{activeLabel}</span> : null}
            </p>
          ) : null}
          <div className="mode-right">
            {mode === 'learn' && stages.length > 1 ? (
              <div className="ink-toggle study-toggle">
                <span className="micro" id="lesson-study-label">
                  STUDY<span className="study-label-word"> MODE</span>
                </span>
                <span id="lesson-study-hint" className="sr-only">
                  Full-screen reading of this lesson. Same content — just scroll.
                  Press Escape to exit.
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
            {/* Reading typography, plus the two reading aids (plain-English
                and diagram notes) that used to be their own OFF/ON pills in
                the bar. Four uppercase toggles read as an app toolbar, and on
                a phone the last two sat off-screen in a hidden scroll row.
                A native disclosure: keyboard-operable, closes on its own, no
                positioning library. */}
            <details className="reading-menu" ref={readingMenuRef}>
              <summary className="reading-menu__summary" aria-label="Reading settings: typeface, size, spacing">
                <span className="reading-menu__aa" aria-hidden>
                  Aa
                </span>
                <span className="micro">READING</span>
              </summary>
              <div className="reading-menu__panel">
                <div className="reading-menu__row">
                  <span className="micro" id="reading-font-label">
                    TYPEFACE
                  </span>
                  <SegmentedControl<ReadingFont>
                    className="ink-seg ink-seg--3"
                    optionClassName="ink-seg-opt"
                    aria-labelledby="reading-font-label"
                    value={readingPrefs.font}
                    onChange={(font) => updateReading({ font })}
                    options={[
                      { value: 'default', label: <span data-face="default">Sans</span> },
                      { value: 'book', label: <span data-face="book">Book</span> },
                      { value: 'clear', label: <span data-face="clear">Clear</span> },
                    ]}
                  />
                  <p className="reading-menu__hint">{READING_FONT_HINT[readingPrefs.font]}</p>
                </div>
                <div className="reading-menu__row">
                  <span className="micro" id="reading-size-label">
                    SIZE
                  </span>
                  <SegmentedControl<ReadingSize>
                    className="ink-seg ink-seg--4"
                    optionClassName="ink-seg-opt"
                    aria-labelledby="reading-size-label"
                    value={readingPrefs.size}
                    onChange={(size) => updateReading({ size })}
                    options={[
                      { value: 's', label: 'S' },
                      { value: 'm', label: 'M' },
                      { value: 'l', label: 'L' },
                      { value: 'xl', label: 'XL' },
                    ]}
                  />
                </div>
                <div className="reading-menu__row">
                  <span className="micro" id="reading-air-label">
                    AIRY SPACING
                  </span>
                  <SegmentedControl
                    className="ink-seg"
                    optionClassName="ink-seg-opt"
                    aria-labelledby="reading-air-label"
                    value={readingPrefs.air ? 'on' : 'off'}
                    onChange={(v) => updateReading({ air: v === 'on' })}
                    options={[
                      { value: 'off', label: 'OFF' },
                      { value: 'on', label: 'ON' },
                    ]}
                  />
                  <p className="reading-menu__hint">
                    Wider letter and line spacing. The one change with solid evidence for readers who lose
                    their place — worth a try whoever you are.
                  </p>
                </div>
                <p className="reading-menu__hint">
                  Pick whatever reads fastest for <em>you</em> — it differs from person to person, by up to a
                  third.
                </p>
                {mode === 'learn' ? (
                  <div className="reading-menu__row reading-menu__row--aid">
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
                    <p className="reading-menu__hint">
                      The same notes in plain English — no jargon. Key points and exam tips stay.
                    </p>
                  </div>
                ) : null}
                {mode === 'learn' && L.notes && L.notes.length > 0 ? (
                  <div className="reading-menu__row reading-menu__row--aid">
                    <span className="micro" id="lesson-visual-notes-label">
                      DIAGRAM NOTES
                    </span>
                    <span id="lesson-visual-notes-hint" className="sr-only">
                      Put a sketch of each note beside the prose. Same words — dual coded.
                    </span>
                    <SegmentedControl
                      className="ink-seg"
                      optionClassName="ink-seg-opt"
                      aria-labelledby="lesson-visual-notes-label"
                      aria-describedby="lesson-visual-notes-hint"
                      value={visualNotes ? 'on' : 'off'}
                      onChange={(v) => {
                        if ((v === 'on') !== visualNotes) toggleVisualNotes()
                      }}
                      options={[
                        { value: 'off', label: 'OFF' },
                        { value: 'on', label: 'ON' },
                      ]}
                    />
                    <p className="reading-menu__hint">A small sketch beside each block of notes.</p>
                  </div>
                ) : null}
                {!isDefaultReading(readingPrefs) ? (
                  <button type="button" className="reading-menu__reset" onClick={() => updateReading({ ...DEFAULT_READING_PREFS })}>
                    Back to defaults
                  </button>
                ) : null}
              </div>
            </details>
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

          <article className="lesson-article" ref={articleRef}>
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

            {L.simple ? (
              <section {...lsecProps('simple')}>
                <SecHead
                  k={secK('simple')}
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
              <section {...lsecProps('syllabus')}>
                <SecHead
                  k={secK('syllabus')}
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
              <section {...lsecProps('criteria')}>
                <SecHead
                  k={secK('criteria')}
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
              <section {...lsecProps('visual')}>
                <SecHead
                  k={secK('visual')}
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
              <section {...lsecProps('figures')}>
                <SecHead
                  k={secK('figures')}
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
              <section {...lsecProps('formulas')}>
                <SecHead
                  k={secK('formulas')}
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
              <section {...lsecProps('compare')}>
                <SecHead
                  k={secK('compare')}
                  title={L.comparisonTable.title}
                  sub="Compare key properties side by side — ideal for exam contrasts."
                />
                <LessonComparisonTable table={L.comparisonTable} />
              </section>
            ) : null}


            {L.notes?.length ? (
              <section {...lsecProps('notes')}>
                <SecHead
                  k={secK('notes')}
                  title="Full topic notes"
                  sub={
                    simpler
                      ? 'Plain-English mode — the exam rigour is one toggle away.'
                      : 'Formal explanation with the rigour you need for the exam.'
                  }
                />
                <FeatureHint hintKey={HINT_KEYS.explain} available={availableHints} />
                {visualNotes ? (
                  <p className="visual-notes-banner micro" role="status">
                    <span className="mono">EXPERIMENT</span>
                    Diagram notes on — same words, sketch beside each block.
                    Toggle off anytime and tell us if it helps.
                  </p>
                ) : null}
                <div className="notes-body">
                  {L.notes.map((n, i) => {
                    const stepMeta = L.steps?.[i]
                    const sketch = visualNotes
                      ? buildNoteSketch(n, {
                          noteIndex: i,
                          stepTitle: stepMeta?.title,
                          stepBody: stepMeta?.body,
                        })
                      : null
                    return (
                    <div key={i} className="note-block" ref={registerNoteBlock(i)}>
                      {sketch ? (
                        <NoteSketchCard
                          sketch={sketch}
                          onOpenFig={
                            L.hasDiagram && !diagramsLocked
                              ? () => {
                                  setStep(i + 1)
                                  scrollToSection('visual')
                                }
                              : undefined
                          }
                        />
                      ) : null}
                      <div className="note-prose">
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
                    </div>
                    )
                  })}
                </div>
              </section>
            ) : null}
            </div>

            {L.worked?.length ? (
              <section {...lsecProps('worked')}>
                <SecHead
                  k={secK('worked')}
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
              <section {...lsecProps('cmap')}>
                <SecHead
                  k={secK('cmap')}
                  title="How it all connects"
                  sub="The big idea sits in the middle — tap a linked idea to explore the link."
                />
                <ConceptMapBlock lesson={L} />
              </section>
            ) : null}

            {L.glossary?.length ? (
              <section {...lsecProps('glossary')}>
                <SecHead
                  k={secK('glossary')}
                  title="Glossary"
                  sub="Key terms for this topic — skim now; the Check step will test them."
                />
                <Glossary items={L.glossary} />
              </section>
            ) : null}

            {L.quiz?.length && !quizLocked ? (
              <section {...lsecProps('quiz')}>
                <SecHead
                  k={secK('quiz')}
                  title="Quick check"
                  sub="Write your answer first, then compare it with the model one — the gap is what you would have lost."
                  bloom={bloomLabelForSection('quiz')}
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

            {L.code && L.lessonSlug ? (
              <section {...lsecProps('teachback')}>
                <SecHead
                  k={secK('teachback')}
                  title="Teach it back"
                  sub="If you can explain it simply, you own it — gaps here are marks you’d lose."
                  bloom={bloomLabelForSection('teachback')}
                />
                <TeachBack
                  subjectCode={L.code}
                  lessonSlug={L.lessonSlug}
                  practiceHref={quizPracticeHref}
                  practiceRef={quizPractice?.ref}
                  onComplete={() => markInteracted('teachback')}
                />
              </section>
            ) : null}

            {L.flashcards?.length && !premiumHidden ? (
              <section {...lsecProps('cards')}>
                <SecHead
                  k={secK('cards')}
                  title="Revision flashcards"
                  sub="Guess first, then flip — retrieval beats re-reading."
                  bloom={bloomLabelForSection('cards')}
                />
                <Flashcards
                  cards={L.flashcards}
                  practiceHref={quizPracticeHref}
                  onDeckComplete={() => markInteracted('cards')}
                />
              </section>
            ) : null}

            {L.takeaways?.length ? (
              <section {...lsecProps('takeaways')}>
                <SecHead
                  k={secK('takeaways')}
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
              <section {...lsecProps('practice')}>
                <SecHead
                  k={secK('practice')}
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
              <section {...lsecProps('resources')}>
                <SecHead
                  k={secK('resources')}
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
              <section {...lsecProps('faqs')}>
                <SecHead k={secK('faqs')} title="Frequently asked" />
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
              <section {...lsecProps('checkpoint')}>
                <SecHead
                  k={secK('checkpoint')}
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
        repaintKey={`${study ? 'study' : 'doc'}|${simpler}|${mode}`}
      />
    </main>
  )
}
