'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  ContinueCourseRow,
  DashStat,
  RecentMark,
  StreakDay,
  WeakTopicRow,
} from '@/lib/courses/margin-notes/adapt-progress'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { subjectProgressPercent } from '@/lib/courses/margin-notes/continue-learning'
import { adaptContinueCourses } from '@/lib/courses/margin-notes/adapt-progress'
import { MarginNotesPageShell } from '@/components/courses/margin-notes/MarginNotesPageShell'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { Ring } from '@/components/courses/margin-notes/Ring'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { buildSignInHref } from '@/lib/auth-redirect'

type Props = {
  firstName: string
  streakDays: number
  streakWeek: StreakDay[]
  stats: DashStat[]
  recent: RecentMark[]
  weakTopics: WeakTopicRow[]
  milestone?: string
  courseCatalog: { code: string; name: string; lessonCount: number }[]
  detailedSection?: React.ReactNode
}

export function ProgressDashboardPage({
  firstName,
  streakDays,
  streakWeek,
  stats,
  recent,
  weakTopics,
  milestone,
  courseCatalog,
  detailedSection,
}: Props) {
  const progressRev = useCourseProgressRevision()
  const { user, loading: authLoading } = useAuthCheck()
  const [continueCourses, setContinueCourses] = useState<ContinueCourseRow[]>([])

  useEffect(() => {
    const rows = courseCatalog.map((c) => ({
      code: c.code,
      name: c.name,
      prog: subjectProgressPercent(c.code, c.lessonCount),
    }))
    setContinueCourses(adaptContinueCourses(rows))
  }, [courseCatalog, progressRev])

  return (
    <MarginNotesPageShell>
      <main className="dash-page" data-screen-label="Progress dashboard">
        <div className="pg">
          <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Progress' }]} />
          <header className="dash-hero">
            <div>
              <p className="overline">Your progress</p>
              <h1 className="h-display dash-title">
                Welcome back,{firstName ? ` ` : ''}
                {firstName ? (
                  <>
                    <em>{firstName}.</em>
                  </>
                ) : (
                  <em>friend.</em>
                )}
              </h1>
              <p className="lead dash-lead">
                You&apos;re marking more than you&apos;re re-reading — that&apos;s exactly how the
                marks come.
              </p>
            </div>
            <div className="dash-streakcard card">
              <p className="micro">STUDY STREAK</p>
              <div className="streak-num">
                <span className="flame">🔥</span>
                <b>{streakDays}</b>
                <span className="streak-days">days</span>
              </div>
              <div className="streak-cal">
                {streakWeek.map((d, i) => (
                  <span key={i} className={`streak-dot${d.active ? ' on' : ''}`}>
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="dash-stats">
            {stats.map((s, i) => (
              <div key={i} className="dash-stat card">
                <b className="dash-stat-n serif">{s.n}</b>
                <span className="dash-stat-l">{s.l}</span>
              </div>
            ))}
          </div>

          <div className="dash-cols">
            <section className="dash-main">
              <h2 className="h3 section-title">Recently marked</h2>
              {recent.length ? (
                <div className="sheet dash-sheet">
                  <div className="sheet-head">
                    <span>QUESTION</span>
                    <span>MARK · OFFICIAL SCHEME</span>
                  </div>
                  {recent.map((r) => {
                    const full = r.got === r.of
                    return (
                      <Link
                        key={r.id}
                        href={r.href}
                        className="dash-mark dash-mark-link"
                      >
                        <div className="dash-mark-top">
                          <span className="dash-mark-ref">{r.ref}</span>
                          <span className={`stamp ${full ? 'ok' : 'no'}`}>
                            {r.got}/{r.of}
                          </span>
                        </div>
                        <span className={full ? 'greennote' : 'rednote'}>{r.note}</span>
                        <span className="dash-when micro">{r.when}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="card card-pad">
                  <p className="body-2">
                    No attempts yet.{' '}
                    <Link href="/mark" className="btn-underline">
                      Mark a question
                    </Link>{' '}
                    and it will show up here.
                  </p>
                </div>
              )}

              {continueCourses.length > 0 ? (
                <>
                  <h2 className="h3 section-title-spaced">Continue learning</h2>
                  {authLoading || user ? null : (
                    <p className="micro dash-continue-sync">
                      Course progress is saved on this device.{' '}
                      <Link className="hub-sync-link" href={buildSignInHref('/dashboard/progress')}>
                        Sign in to sync
                      </Link>
                    </p>
                  )}
                  <div className="dash-continue">
                    {continueCourses.map((s) => (
                      <Link
                        key={s.code}
                        className="dash-course card"
                        href={s.href}
                        style={{ '--acc': accentCssVar(s.acc) } as React.CSSProperties}
                      >
                        <Ring pct={s.prog} size={54} stroke={5} color={accentCssVar(s.acc)} />
                        <div>
                          <h4 className="dash-course-name">{s.name}</h4>
                          <span className="micro">
                            {s.code} · {s.prog}% covered
                          </span>
                        </div>
                        <span className="dash-course-go">→</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            <aside className="dash-aside">
              {weakTopics.length > 0 ? (
                <div className="card card-pad dash-weak">
                  <p className="overline hub-aside-kicker">Spec points to revisit</p>
                  <p className="body-2 how-card-copy dash-weak-copy">
                    Where you&apos;ve lost the most marks lately. Retrieval beats re-reading.
                  </p>
                  {weakTopics.map((w) => (
                    <Link
                      key={w.code + w.n}
                      href={w.href}
                      className="weak-row"
                      style={{ '--acc': accentCssVar(w.acc) } as React.CSSProperties}
                    >
                      <span className="weak-n mono">
                        {w.code} · {w.n}
                      </span>
                      <span className="weak-t">{w.t}</span>
                      <span className="weak-go">revise →</span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {milestone ? (
                <div className="card card-pad hub-tip">
                  <p className="micro tip-kicker">NEXT MILESTONE</p>
                  <p className="body-2 tip-copy">{milestone}</p>
                </div>
              ) : null}
            </aside>
          </div>

          {detailedSection ? (
            <section id="detailed-analytics" className="lsec dash-analytics">
              <SecHead k="+" title="Detailed analytics" sub="Insights, journey, topic mastery and full attempt history." />
              {detailedSection}
            </section>
          ) : null}
        </div>
      </main>
    </MarginNotesPageShell>
  )
}

function SecHead({ k, title, sub }: { k: string; title: string; sub?: string }) {
  return (
    <div className="lsec-head dash-analytics-head">
      <span className="lsec-k mono">{k}</span>
      <h2 className="lsec-title serif">{title}</h2>
      {sub ? <p className="body-2 lsec-sub">{sub}</p> : null}
    </div>
  )
}
