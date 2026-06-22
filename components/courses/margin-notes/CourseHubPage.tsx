'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MarginNotesCourse } from '@/lib/courses/margin-notes/types'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import type { AccentToken } from '@/lib/courses/margin-notes/types'
import { hubPaperProgress } from '@/lib/courses/margin-notes/adapt-course-hub'
import { buildSignInHref } from '@/lib/auth-redirect'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { Ring } from '@/components/courses/margin-notes/Ring'
import { MarginNote } from '@/components/courses/margin-notes/HandAnnotations'

function HowItWorks() {
  const steps = [
    { n: 1, t: 'Choose your paper', d: 'Pick the exam paper you sit, then a topic from the spine.' },
    { n: 2, t: 'Learn visually', d: 'Diagrams, step cards and full notes — or flip to “explain simpler”.' },
    { n: 3, t: 'Practise & mark', d: 'Attempt a real past-paper question, marked against the official scheme.' },
    { n: 4, t: 'Mark complete', d: 'Tick the topic, watch your mastery ring fill, move to the next.' },
  ]
  return (
    <div className="how-grid">
      {steps.map((s) => (
        <div key={s.n} className="how-card">
          <span className="how-num mono">{s.n}</span>
          <div className="how-text">
            <h4 className="how-t">{s.t}</h4>
            <p className="body-2 how-card-copy">{s.d}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

type Props = {
  code: string
  name: string
  level: string
  acc: AccentToken
  glyph: string
  course: MarginNotesCourse
  initialPaperId?: number
  streakLabel?: string
  signedIn?: boolean
  /** URL prefix for course links — '/courses' (Cambridge) or '/ib/courses' (IB). */
  basePath?: string
  /** First breadcrumb crumb — defaults to the Cambridge "Courses" hub. */
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
}

export function CourseHubPage({
  code,
  name,
  level,
  acc,
  glyph,
  course,
  initialPaperId,
  streakLabel = 'New — start your streak today',
  signedIn,
  basePath = '/courses',
  coursesCrumb = { label: 'Courses', href: '/courses' },
  community,
}: Props) {
  const papers = course.papers
  const defaultPaper = initialPaperId ?? papers[0]?.id ?? 1
  const [paper, setPaper] = useState(defaultPaper)
  const router = useRouter()
  const accVar = accentCssVar(acc)

  useEffect(() => {
    if (initialPaperId != null) setPaper(initialPaperId)
  }, [initialPaperId])

  const selectPaper = (id: number) => {
    setPaper(id)
    const meta = papers.find((p) => p.id === id)
    if (meta?.number) {
      router.replace(`${basePath}/${code}?paper=${encodeURIComponent(meta.number)}`, { scroll: false })
    }
  }

  const groups = course.spines[paper] ?? null
  const p1 = course.spines[papers[0]?.id ?? 1] ?? course.units ?? []
  const { done: doneCount, total, pct } = hubPaperProgress(groups)

  const paperTabMeta = useMemo(() => {
    const map: Record<number, { done: number; total: number }> = {}
    for (const p of papers) {
      const { done, total: t } = hubPaperProgress(course.spines[p.id])
      map[p.id] = { done, total: t }
    }
    return map
  }, [papers, course.spines])

  const formatPaperTabMeta = (p: (typeof papers)[number]) => {
    const prog = paperTabMeta[p.id]
    if (prog?.total && prog.done === prog.total) return 'complete ✓'
    if (prog?.total && prog.done > 0) return `${prog.done}/${prog.total} done`
    if (p.topics) return `${p.topics} topics`
    return 'premium'
  }

  const isPaperComplete = (id: number) => {
    const prog = paperTabMeta[id]
    return !!prog?.total && prog.done === prog.total
  }
  const allP1 = p1.flatMap((g) => g.items)
  const firstTopic = allP1[0] ?? { n: '1.1', slug: '', t: '' }
  const activeTopic = (groups ?? []).flatMap((g) => g.items).find((i) => i.active) ?? firstTopic

  const paperMeta = papers.find((p) => p.id === paper)
  const paperNumber = paperMeta?.number

  const topicHref = (slug: string) =>
    paperNumber ? `${basePath}/${code}/${slug}?paper=${encodeURIComponent(paperNumber)}` : `${basePath}/${code}/${slug}`

  return (
    <main
      className="hub-page"
      data-screen-label={`Course hub — ${code} ${name}`}
      style={{ '--hub-acc': accVar } as React.CSSProperties}
    >
      <div className="pg">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            coursesCrumb,
            { label: name },
          ]}
        />
      </div>

      <header className="hub-hero">
        <div className="pg hub-hero-inner">
          <div className="hub-hero-left">
            <span className="hub-glyph">{glyph}</span>
            <div>
              <p className="overline">
                {level} · {code} · Free premium course
              </p>
              <h1 className="h-display hub-hero-title">
                {name}
              </h1>
              <p className="lead hub-lead">
                {course.blurb}
              </p>
              <div className="hub-cta-row">
                {firstTopic.slug ? (
                  <Link className="btn-primary" href={topicHref(firstTopic.slug)}>
                    Start {papers[0]?.name.split('—')[0]?.trim() ?? 'course'} →
                  </Link>
                ) : null}
                {activeTopic.slug ? (
                  <Link className="btn-ghost sm" href={topicHref(activeTopic.slug)}>
                    Continue topic
                  </Link>
                ) : null}
                <Link className="btn-ghost sm" href="/mark">
                  Mark a paper
                </Link>
              </div>
            </div>
          </div>
          <div className="hub-hero-right card">
            <p className="micro">YOUR PROGRESS</p>
            <div className="hub-prog">
              <Ring pct={pct} size={92} stroke={7} color={accVar} label={`${doneCount}/${total}`} />
              <div>
                <p className="body-2 hub-prog-copy">
                  <b className="text-main">
                    {doneCount} of {total}
                  </b>{' '}
                  topics in {paperMeta?.name.split('—')[0]?.trim() ?? `Paper ${paper}`}
                </p>
                <p className="micro hub-prog-sync">
                  {signedIn === false ? (
                    <>
                      SAVED ON THIS DEVICE ·{' '}
                      <Link className="hub-sync-link" href={buildSignInHref(`${basePath}/${code}`)}>
                        SIGN IN TO SYNC
                      </Link>
                    </>
                  ) : (
                    'SAVED ON THIS DEVICE · SIGN IN TO SYNC'
                  )}
                </p>
              </div>
            </div>
            <div className="hub-streak">
              <span className="flame">🔥</span>
              <span className="body-2 hub-streak-copy">
                {streakLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="pg hub-body">
        <div className="paper-tabs">
          {papers.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`paper-tab${paper === p.id ? ' on' : ''}${paperTabMeta[p.id]?.done ? ' has-progress' : ''}${isPaperComplete(p.id) ? ' is-complete' : ''}`}
              onClick={() => selectPaper(p.id)}
            >
              <span className="paper-tab-id mono">
                {p.name.split('—')[0]?.trim().toUpperCase() ?? `PAPER ${p.id}`}
              </span>
              <span className="paper-tab-name">{p.name}</span>
              <span className={`paper-tab-meta${isPaperComplete(p.id) ? ' is-complete' : ''}`}>
                {formatPaperTabMeta(p)}
              </span>
            </button>
          ))}
        </div>

        <div className="hub-cols">
          <div className="spine">
            {groups?.length ? (
              groups.map((g, gi) => (
                <section key={gi} className="spine-unit">
                  <div className="spine-unit-head">
                    <span className="spine-node" />
                    <h3 className="spine-unit-title">{g.unit}</h3>
                  </div>
                  <div className="spine-topics">
                    {g.items.map((it) => (
                      <Link
                        key={it.n}
                        href={topicHref(it.slug)}
                        className={`topic-row${it.active ? ' active' : ''}${it.done ? ' done' : ''}`}
                      >
                        <span
                          className={`topic-check${it.done ? ' on' : ''}${it.active ? ' cur' : ''}`}
                        >
                          {it.done ? '✓' : it.active ? '◆' : ''}
                        </span>
                        <span className="topic-name">{it.t}</span>
                        {it.interactive ? (
                          <span className="topic-interactive mono" title="Interactive diagram">◆ INTERACTIVE</span>
                        ) : null}
                        <span className="topic-n mono">{it.n}</span>
                        {it.active ? (
                          <span className="topic-flag mono">CONTINUE</span>
                        ) : null}
                        <span className="topic-arrow">→</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="spine-empty card card-pad">
                <p className="overline spine-empty-kicker">
                  {paperMeta?.name ?? `Paper ${paper}`}
                </p>
                <h3 className="h3">{paperMeta?.topics ?? '—'} premium lessons</h3>
                <p className="body-2 spine-empty-copy">
                  Same structure as Paper 1 — every syllabus point gets a visual lesson and a real
                  past-paper question to mark.
                </p>
                <button type="button" className="btn-underline" onClick={() => selectPaper(papers[0]?.id ?? 1)}>
                  ← Back to Paper 1
                </button>
              </div>
            )}
          </div>

          <aside className="hub-aside">
            <div className="card card-pad">
              <p className="overline hub-aside-kicker">How this course works</p>
              <HowItWorks />
            </div>
            <div className="card card-pad hub-tip">
              <p className="micro tip-kicker">WHY IT&apos;S DIFFERENT</p>
              <p className="body-2 tip-copy">
                Every lesson ends in a real Cambridge question — marked{' '}
                <b className="text-main">mark-by-mark</b> against the official scheme, not a generic
                AI guess.
              </p>
              <MarginNote className="hub-tip-note">that&apos;s the whole point ↑</MarginNote>
            </div>
          </aside>
        </div>

        {community}
      </div>
    </main>
  )
}
