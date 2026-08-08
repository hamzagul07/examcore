import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { createPageMetadata } from '@/lib/seo/metadata'
import { CaieGraphNav } from '@/components/seo/CaieGraphNav'
import { SyllabusGraphLinks } from '@/components/seo/SyllabusGraphLinks'
import { getCourseLessons } from '@/lib/courses'
import {
  getAllCaieLessonParams,
  getAllCaiePaperTopicParams,
  resolveCaieLesson,
  resolveCaieParams,
  caieLessonPath,
  caiePaperPath,
  isIndexableLesson,
  normalizePaperNumber,
  parseCaiePaperTopicSlug,
} from '@/lib/seo/caie-graph'

type Props = {
  params: Promise<{ level: string; subject: string; code: string; topic: string }>
}

export function generateStaticParams() {
  return [...getAllCaieLessonParams(), ...getAllCaiePaperTopicParams()]
}

export async function generateMetadata({ params }: Props) {
  const { level, subject, code, topic } = await params
  const paper = parseCaiePaperTopicSlug(topic)
  if (paper) {
    const ref = resolveCaieParams(level, subject, code)
    if (!ref) return {}
    const path = caiePaperPath(code, paper)
    if (!path) return {}
    return createPageMetadata({
      title: `${code} Paper ${paper} — ${ref.name} topics & practice`,
      description: `Cambridge ${code} Paper ${paper} topic list with lessons, flashcards and past-paper practice linked to marking.`,
      path,
      keywords: [`${code} paper ${paper}`, `${code} ${ref.name} paper ${paper}`],
    })
  }

  const resolved = resolveCaieLesson(level, subject, code, topic)
  if (!resolved) return {}
  const { ref, lesson } = resolved
  const path = caieLessonPath(code, lesson.slug)!
  return createPageMetadata({
    title: `${lesson.title} — ${code} ${ref.name} revision`,
    description: `Cambridge ${code} lesson on ${lesson.title} (syllabus ${lesson.topicCode}). Notes, flashcards, FAQ and past-paper practice linked to marking.`,
    path,
    keywords: [
      `${code} ${lesson.title}`,
      `${lesson.topicCode} ${ref.name}`,
      `${code} revision`,
    ],
  })
}

function CaiePaperHub({
  level,
  subject,
  code,
  paper,
}: {
  level: string
  subject: string
  code: string
  paper: string
}) {
  const ref = resolveCaieParams(level, subject, code)
  if (!ref) notFound()
  const path = caiePaperPath(code, paper)
  if (!path) notFound()

  const lessons = getCourseLessons(code).filter(
    (l) => isIndexableLesson(l) && normalizePaperNumber(l.paper) === String(paper)
  )
  if (!lessons.length) notFound()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${code} Paper ${paper}`}
        description={`Topics and practice for Cambridge ${code} Paper ${paper}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'CAIE', path: '/caie' },
          { name: `${code} ${ref.name}`, path: ref.hubPath },
          { name: `Paper ${paper}`, path },
        ]}
      />
      <MarketingHero
        label={`${code} · Paper ${paper}`}
        title={`${ref.name} Paper ${paper}`}
        lead={`All indexable ${code} topics tagged to Paper ${paper}, with links into lessons and scheme-aligned marking.`}
      />
      <MarketingSection>
        <ul className="grid list-none gap-3 p-0">
          {lessons.map((lesson) => {
            const href = caieLessonPath(code, lesson.slug)
            if (!href) return null
            return (
              <li key={lesson.slug}>
                <Link href={href} className="ec-card block p-4 font-semibold hover:underline">
                  {lesson.topicCode} · {lesson.title}
                </Link>
              </li>
            )
          })}
        </ul>
        <Link
          href={`/mark?subject=${encodeURIComponent(code)}`}
          className="ec-btn-primary mt-8 inline-flex min-h-[48px]"
        >
          Mark a Paper {paper} style question
        </Link>
      </MarketingSection>
    </MarketingPageShell>
  )
}

export default async function CaieLessonHubPage({ params }: Props) {
  const { level, subject, code, topic } = await params
  const paper = parseCaiePaperTopicSlug(topic)
  if (paper) {
    return <CaiePaperHub level={level} subject={subject} code={code} paper={paper} />
  }

  const resolved = resolveCaieLesson(level, subject, code, topic)
  if (!resolved) notFound()
  const { ref, lesson } = resolved
  const path = caieLessonPath(code, lesson.slug)!
  const intro =
    lesson.simpleExplanation?.summary ||
    lesson.sections?.find((s) => s.type === 'intro')?.content ||
    `Syllabus point ${lesson.topicCode} for Cambridge ${code} ${ref.name}.`
  const keyPointsSection = lesson.sections?.find((s) => s.type === 'keyPoints')
  const keyPoints =
    (keyPointsSection && keyPointsSection.type === 'keyPoints'
      ? keyPointsSection.items
      : null) ??
    lesson.learningObjectives ??
    []

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={lesson.title}
        description={intro.slice(0, 160)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'CAIE', path: '/caie' },
          { name: `${code} ${ref.name}`, path: ref.hubPath },
          { name: lesson.title, path },
        ]}
      />
      {lesson.faq?.length ? (
        <JsonLd data={faqPageNode(lesson.faq.map((f) => ({ q: f.q, a: f.a })))} />
      ) : null}

      <MarketingHero
        label={`${code} · ${lesson.topicCode}`}
        title={lesson.title}
        lead={intro}
      />

      <MarketingSection className="!pt-0">
        <CaieGraphNav code={code} lesson={lesson} active="lesson" />

        {keyPoints.length ? (
          <div className="ec-card mb-6 p-5">
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              What you need to know
            </h2>
            <ul className="ms-body-2 mt-3 list-disc space-y-1 pl-5">
              {keyPoints.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {lesson.simpleExplanation?.steps?.length ? (
          <div className="ec-card mb-6 p-5">
            <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
              {lesson.simpleExplanation.title || 'Simple explanation'}
            </h2>
            <ol className="ms-body-2 mt-3 list-decimal space-y-2 pl-5">
              {lesson.simpleExplanation.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/mark?subject=${encodeURIComponent(code)}&topic=${encodeURIComponent(lesson.topicCode)}`}
            className="ec-btn-primary min-h-[48px]"
          >
            Mark this topic <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/courses/${code}/${lesson.slug}`}
            className="ec-btn-ghost min-h-[48px]"
          >
            Open full visual lesson
          </Link>
        </div>

        <SyllabusGraphLinks code={code} topicCode={lesson.topicCode} />
      </MarketingSection>
    </MarketingPageShell>
  )
}
