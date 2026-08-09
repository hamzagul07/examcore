import Link from 'next/link'
import type { EdexcelUnitCourseLesson } from '@/lib/curriculum-graph/verified-course-links'

type Props = {
  unitCode: string
  unitName: string
  markHref: string
  lessons: EdexcelUnitCourseLesson[]
}

/**
 * Legal study path: our mapped CAIE course lessons + original Edexcel dialect
 * framing. Not a scraped third-party course. Mark CTAs stay board-native.
 */
export function EdexcelUnitStudyPath({
  unitCode,
  unitName,
  markHref,
  lessons,
}: Props) {
  if (!lessons.length) return null
  const syllabus = lessons[0]?.syllabusCode ?? '9709'

  return (
    <section className="mb-10" aria-labelledby="edexcel-study-path-h">
      <p className="ms-overline">Study path</p>
      <h2 id="edexcel-study-path-h" className="ms-h2">
        Learn {unitCode} with mapped free lessons
      </h2>
      <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
        These are MarkScheme&apos;s own Cambridge {syllabus} course lessons mapped
        onto <strong className="text-[var(--ec-text-primary)]">{unitCode} {unitName}</strong>{' '}
        by idea family — not Pearson past papers and not scraped revision-site notes.
        Use them for intuition and worked visuals, then practise and mark with{' '}
        <strong className="text-[var(--ec-text-primary)]">Edexcel IAL</strong> method /
        accuracy conventions.
      </p>

      <ul className="ms-board-index mt-5">
        {lessons.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="ms-board-slip">
              <span className="ms-board-slip__code">{l.topicCode}</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">{l.title}</span>
                <span className="ms-board-slip__meta">
                  Free course · visuals &amp; worked examples
                </span>
                <span className="ms-board-slip__blurb">
                  Overlap topic for {unitCode} — return here to mark in Edexcel dialect.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="ms-board-cross mt-6">
        <p className="ms-overline">Edexcel dialect</p>
        <h3 className="ms-h3">After a lesson — mark like Pearson marks</h3>
        <ul className="ms-body-2 mt-2 max-w-xl list-disc space-y-1 pl-5 text-[var(--ec-text-secondary)]">
          <li>Write the method line that earns the M mark — not only the final number.</li>
          <li>Keep exact forms until the question asks to approximate.</li>
          <li>Watch dependent accuracy: an early slip can wipe later A marks.</li>
          <li>Self-mark with a {unitCode} scheme, then second-pass here.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={markHref}
            className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
          >
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
            Mark {unitCode} -&gt;
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
