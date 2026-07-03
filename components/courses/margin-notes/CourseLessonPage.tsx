'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
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
import { CourseRichText } from '@/components/courses/CourseRichText'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'
import { buildSignInHref } from '@/lib/auth-redirect'
import { LessonUpsell } from '@/components/billing/LessonUpsell'
import { trialDaysLeft, type EffectiveAccess } from '@/lib/billing/access'
import { INTERACTIVE_DIAGRAMS_FREE } from '@/lib/billing/features'
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
} from './lesson-blocks'

type Props = {
  lesson: MarginNotesLesson
  subjectAcc: AccentToken
  paperQuery?: string | null
  signedIn?: boolean
  /** Effective access level; undefined while loading (renders full content for SEO). */
  access?: EffectiveAccess
  trialEndsAt?: string | null
  /** URL prefix for course links — '/courses' (Cambridge) or '/ib/courses' (IB). */
  basePath?: string
  /** First breadcrumb crumb — defaults to the Cambridge "Courses" hub. */
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
}

export function CourseLessonPage({
  lesson: L,
  subjectAcc,
  paperQuery,
  signedIn,
  access,
  trialEndsAt,
  basePath = '/courses',
  coursesCrumb = { label: 'Courses', href: '/courses' },
  community,
}: Props) {
  // Free tier sees notes + formulas only — live diagrams, practice questions and
  // the interactive blocks are gated. `undefined` (loading / SSR) renders full so
  // crawlers index everything and paid users never flash to a locked state.
  const locked = access === 'free'
  // Interactive diagrams are free during launch (see INTERACTIVE_DIAGRAMS_FREE),
  // so they stay open even for the free tier. Everything else follows `locked`.
  const diagramsLocked = locked && !INTERACTIVE_DIAGRAMS_FREE
  const trialDays = access === 'trial' ? trialDaysLeft(trialEndsAt) : 0
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

  const toc = useMemo(
    () =>
      [
        { id: 'simple', label: 'Simple explanation', on: !!L.simple },
        { id: 'syllabus', label: 'Syllabus coverage', on: !!L.subtopics?.length },
        { id: 'visual', label: 'Visual learning', on: hasVisual && !diagramsLocked },
        { id: 'formulas', label: 'Key formulas', on: !!L.formulas?.length },
        { id: 'compare', label: 'Side by side', on: !!L.comparisonTable },
        { id: 'notes', label: 'Full notes', on: !!L.notes?.length },
        { id: 'worked', label: 'Worked examples', on: !!L.worked?.length },
        { id: 'cmap', label: 'Concept map', on: !!L.conceptMap && !locked },
        { id: 'glossary', label: 'Glossary', on: !!L.glossary?.length },
        { id: 'quiz', label: 'Quick check', on: !!L.quiz?.length && !locked },
        { id: 'cards', label: 'Flashcards', on: !!L.flashcards?.length && !locked },
        { id: 'takeaways', label: 'Key takeaways', on: !!L.takeaways?.length },
        { id: 'practice', label: 'Practice', on: !!L.practice && !locked },
        { id: 'resources', label: 'Extra links', on: !!L.resources?.length },
        { id: 'faqs', label: 'FAQs', on: !!L.faqs?.length },
      ].filter((s) => s.on),
    [L, hasVisual, locked, diagramsLocked]
  )

  useEffect(() => {
    setActive((prev) => (toc.some((t) => t.id === prev) ? prev : toc[0]?.id ?? ''))
  }, [toc])

  const [scrollPct, setScrollPct] = useState(0)

  const tocPct = useMemo(() => {
    if (isDone) return 100
    return scrollPct
  }, [isDone, scrollPct])

  const scrollToSection = useCallback((id: string) => {
    jumpTo(id)
    setActive(id)
  }, [])

  useEffect(() => {
    saveLastLesson(L.code, L.slug)
  }, [L.code, L.slug])

  useEffect(() => {
    if (searchParams.get('mode') === 'papers' && practiceCount > 0) setMode('papers')
  }, [searchParams, practiceCount])

  useEffect(() => {
    if (mode !== 'learn' || typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const t = window.setTimeout(() => scrollToSection(hash), 150)
    return () => window.clearTimeout(t)
  }, [mode, scrollToSection])

  useEffect(() => {
    if (mode !== 'learn') return

    const onScroll = () => {
      const article = document.querySelector('.lesson-article') as HTMLElement | null
      if (!article) return
      const rect = article.getBoundingClientRect()
      const top = window.scrollY + rect.top
      const height = article.offsetHeight
      const viewport = window.innerHeight
      const scrolled = window.scrollY - top + viewport * 0.35
      const max = Math.max(1, height - viewport * 0.45)
      setScrollPct(Math.min(99, Math.max(0, Math.round((scrolled / max) * 100))))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [mode, toc])

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
      style={{ '--acc-lesson': acc } as React.CSSProperties}
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

      {access === 'trial' && trialDays > 0 ? (
        <div className="pg">
          <div className="lesson-trial-banner" role="status">
            <span className="lesson-trial-spark mono" aria-hidden>
              TRIAL
            </span>
            <span className="lesson-trial-text">
              <strong>
                {trialDays} {trialDays === 1 ? 'day' : 'days'} of full access left
              </strong>{' '}
              — diagrams, practice &amp; marking are all unlocked.
            </span>
            <Link className="lesson-trial-link" href="/pricing">
              Keep Pro →
            </Link>
          </div>
        </div>
      ) : null}

      <header className="lesson-hero pg">
        <div className="lesson-hero-main">
          <div className="lesson-tagrow">
            <span className="chip outline mono">
              {L.code} · {L.point}
            </span>
            <span className="chip dim mono">{L.sub.toUpperCase()}</span>
            {L.mins ? (
              <span className="chip dim mono">≈ {L.mins} MIN</span>
            ) : null}
            {L.tag === 'premium' || L.tag === 'pilot' ? (
              <span className="chip ok mono">{(L.tag || 'topic').toUpperCase()}</span>
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
                  ? 'Start your 7-day free trial →'
                  : 'Unlock practice & diagrams →'}
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary btn-block"
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
              marked against the real scheme ✓
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
            {mode === 'learn' ? (
              <label className="simpler-toggle">
                <span className="micro">EXPLAIN SIMPLER</span>
                <button
                  type="button"
                  className={`switch${simpler ? ' on' : ''}`}
                  onClick={() => setSimpler((s) => !s)}
                  aria-pressed={simpler}
                >
                  <span className="knob" />
                </button>
              </label>
            ) : null}
          </div>
        </div>
      </div>

      {mode === 'learn' ? (
        <nav className="lesson-mobile-jump pg" aria-label="On this page">
          {toc.map((tt) => (
            <button
              key={tt.id}
              type="button"
              className={`lesson-mobile-jump-link${active === tt.id ? ' on' : ''}`}
              onClick={() => scrollToSection(tt.id)}
            >
              {tt.label}
            </button>
          ))}
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
              practiceCount > 1
                ? `${practiceCount} real Cambridge questions for this topic — mark each one against the official scheme.`
                : 'A real Cambridge question for this topic — mark it against the official scheme.'
            }
          />
          {locked ? (
            <LessonUpsell feature="practice" signedIn={signedIn} />
          ) : (
            <PracticeSection lesson={L} big />
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
              {toc.map((tt, i) => (
                <button
                  key={tt.id}
                  type="button"
                  className={`toc-link${active === tt.id ? ' on' : ''}`}
                  aria-current={active === tt.id ? 'true' : undefined}
                  onClick={() => scrollToSection(tt.id)}
                >
                  <span className="toc-num mono">{String(i + 1).padStart(2, '0')}</span>
                  {tt.label}
                </button>
              ))}
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

          <article className="lesson-article">
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

            {L.simple ? (
              <section id="simple" className="lsec">
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
              <section id="syllabus" className="lsec">
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

            {hasVisual ? (
              <section id="visual" className="lsec">
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

            {L.formulas?.length ? (
              <section id="formulas" className="lsec">
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
              <section id="compare" className="lsec">
                <SecHead
                  k="·"
                  title={L.comparisonTable.title}
                  sub="Compare key properties side by side — ideal for exam contrasts."
                />
                <LessonComparisonTable table={L.comparisonTable} />
              </section>
            ) : null}

            {L.notes?.length ? (
              <section id="notes" className="lsec">
                <SecHead
                  k="04"
                  title="Full topic notes"
                  sub={
                    simpler
                      ? 'Plain-English mode — the exam rigour is one toggle away.'
                      : 'Formal explanation with the rigour you need for the exam.'
                  }
                />
                <div className="notes-body">
                  {L.notes.map((n, i) => (
                    <div key={i} className="note-block">
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
                      {n.bullets?.length && !simpler ? (
                        <ul className="note-bullets">
                          {n.bullets.map((b, bi) => (
                            <li key={bi} className="body-2">
                              <CourseRichText content={b} variant="prose" />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {n.tip && !simpler ? (
                        <div className="note-tip">
                          <span className="note-tip-tag mono">EXAM TIP</span>
                          <div className="body-2">
                            <CourseRichText content={n.tip} variant="prose" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {L.worked?.length ? (
              <section id="worked" className="lsec">
                <SecHead
                  k="05"
                  title="Worked examples"
                  sub="See the formulas applied — reveal one step at a time, like the exam."
                />
                <div className="worked-stack">
                  {L.worked.map((w, i) => (
                    <Worked key={i} w={w} idx={i} />
                  ))}
                </div>
              </section>
            ) : null}

            {L.conceptMap && !locked ? (
              <section id="cmap" className="lsec">
                <SecHead
                  k="06"
                  title="How it all connects"
                  sub="The big idea sits in the middle — tap a linked idea to explore the link."
                />
                <ConceptMapBlock lesson={L} />
              </section>
            ) : null}

            {L.glossary?.length ? (
              <section id="glossary" className="lsec">
                <SecHead
                  k="07"
                  title="Glossary"
                  sub="Try to recall each definition before you reveal it."
                />
                <Glossary items={L.glossary} />
              </section>
            ) : null}

            {L.quiz?.length && !locked ? (
              <section id="quiz" className="lsec">
                <SecHead
                  k="08"
                  title="Quick check"
                  sub="Answer in your head first — then tap to check. No pressure."
                />
                <QuickCheck items={L.quiz} />
              </section>
            ) : null}

            {L.flashcards?.length && !locked ? (
              <section id="cards" className="lsec">
                <SecHead
                  k="09"
                  title="Revision flashcards"
                  sub="Flip the card. Test yourself before the exam."
                />
                <Flashcards cards={L.flashcards} />
              </section>
            ) : null}

            {L.takeaways?.length ? (
              <section id="takeaways" className="lsec">
                <SecHead
                  k="10"
                  title="Key takeaways"
                  sub="Review these before you close the topic — retrieval beats re-reading."
                />
                <ul className="takeaways">
                  {L.takeaways.map((t, i) => (
                    <li key={i}>
                      <span className="take-check">✓</span>
                      <CourseRichText content={t} variant="prose" className="body-2 takeaway-rich" breakAnywhere={false} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {L.practice ? (
              <section id="practice" className="lsec">
                <SecHead
                  k="11"
                  title="Practice — then mark it"
                  sub="The whole point: a real Cambridge question, marked mark-by-mark."
                />
                {locked ? (
                  <LessonUpsell feature="practice" signedIn={signedIn} />
                ) : (
                  <PracticeSection lesson={L} />
                )}
              </section>
            ) : null}

            {L.resources?.length ? (
              <section id="resources" className="lsec">
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
              <section id="faqs" className="lsec">
                <SecHead k="·" title="Frequently asked" />
                <div className="faqs">
                  {L.faqs.map((f, i) => (
                    <Faq key={i} f={f} />
                  ))}
                </div>
              </section>
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
    </main>
  )
}
