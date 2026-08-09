import Link from 'next/link'
import { edexcelUnitPath } from '@/lib/seo/edexcel-graph'
import { verifiedCourseLessonsForEdexcelUnit } from '@/lib/curriculum-graph/verified-course-links'
import { edexcelMarkHref } from '@/lib/edexcel/marking'

const GROUPS: Array<{
  label: string
  units: Array<{ code: string; name: string }>
}> = [
  {
    label: 'Pure',
    units: [
      { code: 'WMA11', name: 'Pure 1' },
      { code: 'WMA12', name: 'Pure 2' },
      { code: 'WMA13', name: 'Pure 3' },
      { code: 'WMA14', name: 'Pure 4' },
    ],
  },
  {
    label: 'Mechanics',
    units: [
      { code: 'WME01', name: 'Mechanics 1' },
      { code: 'WME02', name: 'Mechanics 2' },
    ],
  },
  {
    label: 'Statistics',
    units: [
      { code: 'WST01', name: 'Statistics 1' },
      { code: 'WST02', name: 'Statistics 2' },
    ],
  },
]

type Props = { qualification: string; subjectSlug: string }

/** Pure / Mech / Stats study-path strip on the IAL Maths subject hub. */
export function EdexcelMathsStudyStrip({ qualification, subjectSlug }: Props) {
  return (
    <section className="mb-10" aria-labelledby="edexcel-maths-study-h">
      <p className="ms-overline">Free study paths</p>
      <h2 id="edexcel-maths-study-h" className="ms-h2">
        Learn by unit — then mark in Edexcel dialect
      </h2>
      <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
        Mapped visual lessons from our Cambridge 9709 course, grouped the way you sit
        papers. Open a unit, study the overlap topics, mark with Pearson M/A conventions.
      </p>
      <div className="mt-6 grid gap-6">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <h3 className="ms-h3 mb-3">{g.label}</h3>
            <ul className="ms-board-index">
              {g.units.map((u) => {
                const lessons = verifiedCourseLessonsForEdexcelUnit(u.code)
                const n = lessons.length
                const live = lessons.filter((l) => l.hasLiveDiagram).length
                return (
                  <li key={u.code}>
                    <Link
                      href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                      className="ms-board-slip"
                    >
                      <span className="ms-board-slip__code">{u.code}</span>
                      <span className="ms-board-slip__body">
                        <span className="ms-board-slip__name">{u.name}</span>
                        <span className="ms-board-slip__meta">
                          {n} lessons
                          {live > 0 ? ` · ${live} live diagrams` : ''}
                          {' · mark live'}
                        </span>
                      </span>
                      <span className="ms-board-slip__go" aria-hidden>
                        -&gt;
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Link
          href={edexcelMarkHref('WMA11')}
          className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
        >
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
          Mark WMA11 now -&gt;
        </Link>
      </div>
    </section>
  )
}
