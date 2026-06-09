import Link from 'next/link'
import { Beaker, ClipboardList, Target } from 'lucide-react'
import type { PaperTrackWithStats } from '@/lib/courses/paper-tracks'

const PRACTICAL_LINKS: Record<
  string,
  { title: string; slug: string; topicCode: string; why: string }[]
> = {
  '3': [
    {
      title: 'Errors and uncertainties',
      slug: '1-3-errors-and-uncertainties',
      topicCode: '1.3',
      why: 'Graph gradients, percentage uncertainty, and significant figures — core Paper 3 skills.',
    },
    {
      title: 'Practical circuits',
      slug: '10-1-practical-circuits',
      topicCode: '10.1',
      why: 'Series/parallel layouts, ammeters, voltmeters, and power in real circuits.',
    },
    {
      title: 'Resistance and resistivity',
      slug: '9-3-resistance-and-resistivity',
      topicCode: '9.3',
      why: 'I–V graphs, Ohm’s law experiments, and material properties.',
    },
  ],
  '5': [
    {
      title: 'Errors and uncertainties',
      slug: '1-3-errors-and-uncertainties',
      topicCode: '1.3',
      why: 'Planning experiments, combining uncertainties, and evaluating conclusions.',
    },
    {
      title: 'Specific heat capacity',
      slug: '14-3-specific-heat-capacity-and-specific-latent-heat',
      topicCode: '14.3',
      why: 'Classic planning question: heating curves, energy balance, and sensible graphs.',
    },
    {
      title: 'Kinetic theory of gases',
      slug: '15-3-kinetic-theory-of-gases',
      topicCode: '15.3',
      why: 'Modelling assumptions, variable control, and data analysis at A Level.',
    },
  ],
}

export function CoursePracticalPaperGuide({
  subjectCode,
  track,
}: {
  subjectCode: string
  track: PaperTrackWithStats
}) {
  const links = PRACTICAL_LINKS[track.number]
  if (!links?.length) return null

  const isPaper3 = track.number === '3'

  return (
    <section className="mb-8 rounded-2xl border border-[var(--course-border)] bg-[var(--course-surface-card)] p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        {isPaper3 ? (
          <Beaker className="mt-0.5 h-5 w-5 shrink-0 text-[var(--course-accent)]" aria-hidden />
        ) : (
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[var(--course-accent)]" aria-hidden />
        )}
        <div>
          <h2 className="course-studio-section-title m-0 text-lg">
            {track.shortName} — {track.subtitle}
          </h2>
          <p className="course-studio-prose m-0 mt-2 text-[0.95rem]">
            {isPaper3
              ? 'Paper 3 tests hands-on practical skills across the whole AS syllabus. Start with measurement technique, then revise circuit and data-handling topics below before attempting real Paper 3 scripts on MarkScheme.'
              : 'Paper 5 asks you to plan, analyse, and evaluate experiments. Build from uncertainty work (topic 1.3), then study the planning-heavy A Level topics linked here.'}
          </p>
        </div>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {links.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/courses/${subjectCode}/${item.slug}?paper=${track.number}`}
              className="flex flex-col gap-1 rounded-xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] p-4 no-underline transition-colors hover:border-[var(--course-accent)]"
            >
              <span className="font-semibold text-[var(--ec-text-primary)]">
                {item.topicCode} · {item.title}
              </span>
              <span className="text-sm text-[var(--ec-text-secondary)]">{item.why}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/mark?subject=${subjectCode}&paper=9702%2F${isPaper3 ? '31' : '51'}`}
        className="ec-btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold no-underline"
      >
        <Target className="h-4 w-4" aria-hidden />
        Mark {track.shortName} past papers
      </Link>
    </section>
  )
}
