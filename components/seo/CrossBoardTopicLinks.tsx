import Link from 'next/link'
import {
  edexcelPathForUnit,
  listOverlapForSubject,
  resolveCaieLinksForEdexcelUnit,
  resolveCaieLinksForOxfordaqaSubject,
  resolveCourseLinksForEdexcelUnit,
  resolveCourseLinksForOxfordaqaSubject,
  resolveEdexcelLinksForCaieTopic,
} from '@/lib/curriculum-graph'
import { edexcelMarkHref } from '@/lib/edexcel/marking'

type CrossBoardTopicLinksProps =
  | { mode: 'caie-topic'; syllabusCode: string; topicCode: string }
  | { mode: 'edexcel-unit'; unitCode: string }
  | { mode: 'edexcel-maths-hub' }
  | { mode: 'edexcel-subject-hub'; syllabusCode: '9709' | '9702' | '9701' | '9700' }
  | { mode: 'oxfordaqa-subject'; contentCode: string }

/**
 * Cross-board overlap + course-reuse links (curriculum graph).
 * Does not fork lesson JSON — course hrefs point at CAIE /courses/*.
 */
export function CrossBoardTopicLinks(props: CrossBoardTopicLinksProps) {
  if (props.mode === 'caie-topic') {
    if (!['9709', '9702', '9701', '9700'].includes(props.syllabusCode)) return null
    const links = resolveEdexcelLinksForCaieTopic(props.syllabusCode, props.topicCode)
    if (!links.length) return null
    const edexcel = links.filter((l) => l.board === 'edexcel')
    const oxford = links.filter((l) => l.board === 'oxfordaqa')
    return (
      <aside
        className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
        aria-label="Related on other boards"
      >
        {edexcel.length ? (
          <>
            <p className="ms-overline mb-2">Related on Edexcel IAL</p>
            <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
              Same idea family on Pearson International A Level — different paper rhythm and
              UMS cash-in. Practise the unit you sit.
            </p>
            <ul className="flex flex-wrap gap-2">
              {edexcel.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex rounded border border-[var(--ec-border)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {l.syllabusOrUnit} · {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={edexcelMarkHref(edexcel[0]?.syllabusOrUnit)}
              className="ec-btn-ghost ec-btn-ghost--sm mt-3 inline-flex"
            >
              Mark on Edexcel board
            </Link>
          </>
        ) : null}
        {oxford.length ? (
          <>
            <p className="ms-overline mb-2 mt-4">Related on OxfordAQA</p>
            <ul className="flex flex-wrap gap-2">
              {oxford.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex rounded border border-[var(--ec-border)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>
    )
  }

  if (props.mode === 'edexcel-unit') {
    const shellLinks = resolveCaieLinksForEdexcelUnit(props.unitCode).slice(0, 8)
    const courseLinks = resolveCourseLinksForEdexcelUnit(props.unitCode).slice(0, 8)
    if (!shellLinks.length && !courseLinks.length) return null
    const syllabus = courseLinks[0]?.syllabusOrUnit ?? shellLinks[0]?.syllabusOrUnit ?? '9709'
    return (
      <aside
        className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
        aria-label="Related Cambridge lessons"
      >
        <p className="ms-overline mb-2">Study overlapping Cambridge lessons</p>
        <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
          Mapped CAIE lessons (same idea family) — reuse the free course spine; mark with
          the board you sit.
        </p>
        {courseLinks.length ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {courseLinks.map((l) => (
              <li key={`c-${l.topicCode}-${l.href}`}>
                <Link
                  href={l.href}
                  className="inline-flex rounded border border-[var(--ec-brand)]/30 bg-[var(--ec-brand)]/5 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/50"
                >
                  Course · {l.topicCode}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {shellLinks.length ? (
          <ul className="flex flex-wrap gap-2">
            {shellLinks.map((l) => (
              <li key={`${l.topicCode}-${l.href}`}>
                <Link
                  href={l.href}
                  className="inline-flex rounded border border-[var(--ec-border)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {l.topicCode} · {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link
          href={`/courses/${syllabus}`}
          className="ec-btn-underline mt-3 inline-flex"
        >
          Open Cambridge {syllabus} course
        </Link>
      </aside>
    )
  }

  if (props.mode === 'oxfordaqa-subject') {
    const shellLinks = resolveCaieLinksForOxfordaqaSubject(props.contentCode).slice(0, 8)
    const courseLinks = resolveCourseLinksForOxfordaqaSubject(props.contentCode).slice(0, 8)
    if (!shellLinks.length && !courseLinks.length) return null
    const syllabus = courseLinks[0]?.syllabusOrUnit ?? shellLinks[0]?.syllabusOrUnit ?? '9709'
    return (
      <aside
        className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
        aria-label="Related Cambridge lessons"
      >
        <p className="ms-overline mb-2">Study overlapping Cambridge lessons</p>
        <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
          OxfordAQA topic overlap mapped onto the CAIE course spine — no forked lesson JSON.
        </p>
        {courseLinks.length ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {courseLinks.map((l) => (
              <li key={`c-${l.topicCode}-${l.href}`}>
                <Link
                  href={l.href}
                  className="inline-flex rounded border border-[var(--ec-brand)]/30 bg-[var(--ec-brand)]/5 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide"
                >
                  Course · {l.topicCode}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={`/courses/${syllabus}`} className="ec-btn-underline mt-3 inline-flex">
          Open Cambridge {syllabus} course
        </Link>
      </aside>
    )
  }

  const syllabusCode =
    props.mode === 'edexcel-subject-hub' ? props.syllabusCode : '9709'
  const overlap = listOverlapForSubject(syllabusCode)
  if (!overlap.length) return null
  return (
    <aside
      className="mt-8 ec-card border border-[var(--ec-border)] px-5 py-4"
      aria-label="Cambridge overlap map"
    >
      <p className="ms-overline mb-2">Cambridge {syllabusCode} overlap</p>
      <p className="ms-body-2 mb-3" style={{ marginTop: 0 }}>
        Topic-level map from Cambridge into Edexcel units (IAL or UK A Level —
        content graph, not a grade converter). Open a unit for mapped free course
        lessons.
      </p>
      <ul className="grid list-none gap-2 p-0 sm:grid-cols-2">
        {overlap.map((o) => (
          <li key={o.unitCode}>
            <Link
              href={edexcelPathForUnit(o.unitCode)}
              className="ec-card block p-3 text-sm"
            >
              <span className="font-semibold">
                {o.unitCode} · {o.label}
              </span>
              <span className="ms-micro mt-1 block">{o.topicCount} mapped topics</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/caie/a-level/${subjectSlug}/${syllabusCode}`}
        className="ec-btn-underline mt-3 inline-flex"
      >
        Open Cambridge {syllabusCode}
      </Link>
    </aside>
  )
}
