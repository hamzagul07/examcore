import Link from 'next/link'
import type { VerifiedBoardCourseLesson } from '@/lib/curriculum-graph/verified-course-links'
import { oxfordaqaStudyLessonHref } from '@/lib/oxfordaqa/study-path'

type Props = {
  contentCode: string
  subjectName: string
  markHref: string
  lessons: VerifiedBoardCourseLesson[]
}

/**
 * Legal study path: our mapped CAIE course lessons + OxfordAQA dialect framing.
 * Not a scraped third-party course. Mark CTAs stay board-native.
 */
export function OxfordaqaSubjectStudyPath({
  contentCode,
  subjectName,
  markHref,
  lessons,
}: Props) {
  if (!lessons.length) return null
  const syllabus = lessons[0]?.syllabusCode ?? '9709'
  const liveCount = lessons.filter((l) => l.hasLiveDiagram).length
  const stepTotal = lessons.reduce((n, l) => n + l.diagramStepCount, 0)
  const paramCount = lessons.filter((l) => l.hasDiagramParams).length

  return (
    <section className="mb-10" aria-labelledby="oxfordaqa-study-path-h">
      <p className="ms-overline">Study path</p>
      <h2 id="oxfordaqa-study-path-h" className="ms-h2">
        Learn OxfordAQA {subjectName} with mapped free lessons
      </h2>
      <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
        MarkScheme&apos;s own Cambridge {syllabus} lessons, mapped onto{' '}
        <strong className="text-[var(--ec-text-primary)]">
          OxfordAQA {subjectName}
        </strong>{' '}
        by idea family — not OxfordAQA papers, not scraped notes. Learn the visual,
        then mark in <strong className="text-[var(--ec-text-primary)]">OxfordAQA</strong>{' '}
        dialect.
      </p>
      <ol className="ms-body-2 mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[var(--ec-text-primary)]">
        <li>
          <span className="font-semibold">1.</span> Open a lesson on the live diagram
        </li>
        <li>
          <span className="font-semibold">2.</span> Mark OxfordAQA {subjectName}
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
              <Link
                href={oxfordaqaStudyLessonHref(l.href, contentCode)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{l.topicCode}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{l.title}</span>
                  <span className="ms-board-slip__meta">{meta}</span>
                  <span className="ms-board-slip__blurb">
                    Opens on the live diagram with OxfordAQA context — then mark in
                    board dialect.
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
        <p className="ms-overline">OxfordAQA dialect</p>
        <h3 className="ms-h3">After a lesson — mark like OxfordAQA marks</h3>
        <ul className="ms-body-2 mt-2 max-w-xl list-disc space-y-1 pl-5 text-[var(--ec-text-secondary)]">
          <li>Show the method that earns the mark — not only the final number.</li>
          <li>Keep exact forms until the question asks to approximate.</li>
          <li>Watch dependent accuracy across linked parts.</li>
          <li>Self-mark with an OxfordAQA scheme, then second-pass here.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={markHref}
            className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
          >
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
            Mark OxfordAQA {subjectName} -&gt;
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
