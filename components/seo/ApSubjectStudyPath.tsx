import Link from 'next/link'
import type { VerifiedBoardCourseLesson } from '@/lib/curriculum-graph/verified-course-links'
import { apStudyLessonHref } from '@/lib/ap/study-path'

type Props = {
  contentCode: string
  courseName: string
  markHref: string
  lessons: VerifiedBoardCourseLesson[]
}

/**
 * Legal study path: our mapped CAIE course lessons + AP FRQ dialect framing.
 * Not a scraped College Board course. Mark CTAs stay board-native.
 */
export function ApSubjectStudyPath({
  contentCode,
  courseName,
  markHref,
  lessons,
}: Props) {
  if (!lessons.length) return null
  const syllabus = lessons[0]?.syllabusCode ?? '9709'
  const liveCount = lessons.filter((l) => l.hasLiveDiagram).length
  const stepTotal = lessons.reduce((n, l) => n + l.diagramStepCount, 0)
  const paramCount = lessons.filter((l) => l.hasDiagramParams).length

  return (
    <section className="mb-10" aria-labelledby="ap-study-path-h">
      <p className="ms-overline">Study path</p>
      <h2 id="ap-study-path-h" className="ms-h2">
        Learn AP {courseName} with mapped free lessons
      </h2>
      <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
        MarkScheme&apos;s own Cambridge {syllabus} lessons, mapped onto{' '}
        <strong className="text-[var(--ec-text-primary)]">AP {courseName}</strong> by idea
        family — not AP Classroom, not scraped notes. Learn the visual, then mark with{' '}
        <strong className="text-[var(--ec-text-primary)]">FRQ scoring guidelines</strong>.
      </p>
      <ol className="ms-body-2 mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[var(--ec-text-primary)]">
        <li>
          <span className="font-semibold">1.</span> Open a lesson on the live diagram
        </li>
        <li>
          <span className="font-semibold">2.</span> Mark AP {courseName}
        </li>
        <li>
          <span className="font-semibold">3.</span> Land back on the same lesson
        </li>
      </ol>
      {liveCount > 0 ? (
        <p className="ms-body-2 mt-3 text-[var(--ec-text-secondary)]">
          {liveCount} live diagrams
          {stepTotal > 0 ? ` · ${stepTotal} synced steps` : ''}
          {paramCount > 0 ? ` · ${paramCount} with interactive controls` : ''}
          .
        </p>
      ) : null}

      <ul className="ms-board-index mt-5">
        {lessons.map((l) => {
          const meta = l.hasLiveDiagram
            ? [
                l.diagramStepCount > 0 ? `${l.diagramStepCount} steps` : null,
                'live SVG',
                l.hasDiagramParams ? 'sliders' : null,
                'free',
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Worked steps · free'
          return (
            <li key={l.href}>
              <Link href={apStudyLessonHref(l.href, contentCode)} className="ms-board-slip">
                <span className="ms-board-slip__code">{l.topicCode}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{l.title}</span>
                  <span className="ms-board-slip__meta">{meta}</span>
                  <span className="ms-board-slip__blurb">
                    Opens on the live diagram with AP context — then mark FRQ points.
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

      <div className="ms-board-cross mt-6">
        <p className="ms-overline">AP FRQ dialect</p>
        <h3 className="ms-h3">After a lesson — mark like College Board marks</h3>
        <ul className="ms-body-2 mt-2 max-w-xl list-disc space-y-1 pl-5 text-[var(--ec-text-secondary)]">
          <li>Earn each scoring-guideline point — not A-Level M1/A1 language.</li>
          <li>Show algebraic setup, units, and justification where the guide awards them.</li>
          <li>Partial credit is point-shaped: missing setup usually loses the point.</li>
          <li>Self-score with the official guideline, then second-pass here.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={markHref}
            className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
          >
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              FRQ
            </span>
            Mark AP {courseName} -&gt;
          </Link>
          <Link
            href={`/courses/${syllabus}`}
            className="ec-btn-ghost inline-flex min-h-[48px] items-center"
          >
            Full {syllabus} course hub
          </Link>
        </div>
      </div>
    </section>
  )
}
