import Link from 'next/link'

import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import type { CaieSurface } from '@/lib/seo/caie-graph'
import { CAIE_SURFACES, lessonHasSurface } from '@/lib/seo/caie-graph'
import { ibLessonPath, ibSurfacePath } from '@/lib/seo/ib-graph'
import type { CourseLesson } from '@/lib/courses/types'
import { CourseRichText } from '@/components/courses/CourseRichText'

const LABELS: Record<CaieSurface, string> = {
  flashcards: 'Flashcards',
  faq: 'FAQ',
  quiz: 'Quiz',
  questions: 'Questions',
  mistakes: 'Common mistakes',
}

export function IbSurfacePage({
  slug,
  subjectName,
  lesson,
  surface,
}: {
  slug: string
  subjectName: string
  lesson: CourseLesson
  surface: CaieSurface
}) {
  const lessonPath = ibLessonPath(slug, lesson.slug)
  const path = ibSurfacePath(slug, lesson.slug, surface)
  const markHref = `/mark?board=ib&subject=${encodeURIComponent(slug)}`

  const examTips =
    lesson.sections?.filter((s) => s.type === 'examTip').map((s) => s.content) ?? []

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${lesson.title} ${LABELS[surface]}`}
        description={`IB ${subjectName} ${surface} for ${lesson.title}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB courses', path: '/ib/courses' },
          { name: subjectName, path: `/ib/courses/${slug}` },
          { name: lesson.title, path: lessonPath },
          { name: LABELS[surface], path },
        ]}
      />
      {surface === 'faq' && lesson.faq?.length ? (
        <JsonLd data={faqPageNode(lesson.faq.map((f) => ({ q: f.q, a: f.a })))} />
      ) : null}

      <MarketingHero
        label={`IB · ${subjectName}`}
        title={`${lesson.title} — ${LABELS[surface]}`}
        lead={`Indexable ${surface} for ${lesson.title}. Practise, then mark with IB criteria.`}
      />

      <MarketingSection className="!pt-0">
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Lesson surfaces">
          <Link href={lessonPath} className="ec-btn-ghost min-h-[40px] text-sm">
            Lesson
          </Link>
          {CAIE_SURFACES.filter((s) => lessonHasSurface(lesson, s)).map((s) => (
            <Link
              key={s}
              href={ibSurfacePath(slug, lesson.slug, s)}
              className={
                s === surface
                  ? 'ec-btn-primary min-h-[40px] text-sm'
                  : 'ec-btn-ghost min-h-[40px] text-sm'
              }
            >
              {LABELS[s]}
            </Link>
          ))}
        </nav>

        {surface === 'flashcards' ? (
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {(lesson.flashcards ?? []).map((card, i) => (
              <li key={i} className="ec-card ec-card--paper p-4">
                <p className="font-semibold">{card.front}</p>
                <p className="ms-body-2 mt-2">{card.back}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {surface === 'faq' ? (
          <dl className="space-y-4">
            {(lesson.faq ?? []).map((f) => (
              <div key={f.q} className="ec-card ec-card--paper p-5">
                <dt className="font-semibold">
                  <h2 className="text-base font-semibold">{f.q}</h2>
                </dt>
                <dd className="ms-body-2 mt-2">
                  <CourseRichText content={f.a} variant="prose" />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {surface === 'quiz' ? (
          <ol className="space-y-4">
            {(lesson.quickCheck ?? []).map((q, i) => (
              <li key={i} className="ec-card ec-card--paper p-5">
                <p className="font-semibold">{q.prompt}</p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-[var(--ec-brand)]">
                    Show answer
                  </summary>
                  <div className="ms-body-2 mt-2">
                    <CourseRichText content={q.answer} variant="prose" />
                  </div>
                </details>
              </li>
            ))}
          </ol>
        ) : null}

        {surface === 'questions' ? (
          <div className="ec-card ec-card--paper p-5">
            <p className="ms-body-2">
              Open the full lesson for worked examples, then mark a practice answer against IB
              criteria.
            </p>
            <Link href={lessonPath} className="ec-btn-ghost mt-4 inline-flex min-h-[44px]">
              Full lesson
            </Link>
          </div>
        ) : null}

        {surface === 'mistakes' ? (
          <div className="space-y-4">
            {examTips.map((tip, i) => (
              <article key={i} className="ec-card ec-card--paper p-5">
                <h2 className="ms-h3" style={{ fontSize: '1.05rem' }}>
                  Exam tip {i + 1}
                </h2>
                <div className="ms-body-2 mt-2">
                  <CourseRichText content={tip} variant="prose" />
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <Link href={markHref} className="ec-btn-primary mt-8 inline-flex min-h-[48px]">
          Mark with IB criteria <span className="h-4 w-4" aria-hidden>-&gt;</span>
        </Link>
      </MarketingSection>
    </MarketingPageShell>
  )
}
