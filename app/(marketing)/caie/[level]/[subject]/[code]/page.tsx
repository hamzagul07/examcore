import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseLessons } from '@/lib/courses'
import {
  getAllCaieHubParams,
  resolveCaieParams,
  caieLessonPath,
  caiePaperPath,
  isIndexableLesson,
  CAIE_SURFACES,
  lessonHasSurface,
  caieSurfacePath,
  normalizePaperNumber,
} from '@/lib/seo/caie-graph'

type Props = { params: Promise<{ level: string; subject: string; code: string }> }

export function generateStaticParams() {
  return getAllCaieHubParams()
}

export async function generateMetadata({ params }: Props) {
  const { level, subject, code } = await params
  const ref = resolveCaieParams(level, subject, code)
  if (!ref) return {}
  return createPageMetadata({
    title: `${code} ${ref.name} — Cambridge ${ref.levelSlug} syllabus hub`,
    description: `Free ${code} ${ref.name} lessons, flashcards, FAQs, quizzes and past-paper practice — linked to scheme-aligned marking.`,
    path: ref.hubPath,
    keywords: [
      `${code} ${ref.name}`,
      `${code} revision`,
      `Cambridge ${ref.name} course`,
      `free ${code} notes`,
    ],
  })
}

export default async function CaieSubjectHubPage({ params }: Props) {
  const { level, subject, code } = await params
  const ref = resolveCaieParams(level, subject, code)
  if (!ref) notFound()

  const lessons = getCourseLessons(code).filter(isIndexableLesson)
  const papers = [
    ...new Set(
      lessons
        .map((l) => normalizePaperNumber(l.paper))
        .filter((p): p is string => Boolean(p))
    ),
  ].sort((a, b) => Number(a) - Number(b))

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={ref.hubPath}
        title={`${code} ${ref.name}`}
        description={`Cambridge ${code} syllabus learning hub.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'CAIE', path: '/caie' },
          { name: `${code} ${ref.name}`, path: ref.hubPath },
        ]}
      />
      <MarketingHero
        label={`CAIE · ${ref.levelSlug}`}
        title={`${code} ${ref.name}`}
        lead={`Syllabus-aligned lessons for Cambridge ${code}. Open a topic for the full lesson, or jump straight to flashcards, FAQ, quiz and practice — then mark a real past-paper question.`}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/mark?subject=${encodeURIComponent(code)}`}
            className="ec-btn-primary min-h-[48px]"
          >
            Mark a {code} question <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/courses/${code}`} className="ec-btn-ghost min-h-[48px]">
            Course studio
          </Link>
          <Link href={`/past-papers/${code}`} className="ec-btn-ghost min-h-[48px]">
            Past papers
          </Link>
        </div>
      </MarketingHero>

      {papers.length ? (
        <MarketingSection>
          <h2 className="ms-h2">By paper</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {papers.map((p) => {
              const href = caiePaperPath(code, p)
              if (!href) return null
              return (
                <li key={p}>
                  <Link href={href} className="ec-btn-ghost min-h-[40px]">
                    Paper {p}
                  </Link>
                </li>
              )
            })}
          </ul>
        </MarketingSection>
      ) : null}

      <MarketingSection>
        <h2 className="ms-h2">Topics</h2>
        <ul className="mt-6 grid list-none gap-3 p-0">
          {lessons.map((lesson) => {
            const href = caieLessonPath(code, lesson.slug)
            if (!href) return null
            const surfaces = CAIE_SURFACES.filter((s) => lessonHasSurface(lesson, s))
            return (
              <li key={lesson.slug} className="ec-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={href} className="font-semibold hover:underline">
                      {lesson.topicCode} · {lesson.title}
                    </Link>
                    {lesson.paperName ? (
                      <p className="ms-micro mt-1">{lesson.paperName}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {surfaces.map((s) => {
                      const sHref = caieSurfacePath(code, lesson.slug, s)
                      if (!sHref) return null
                      return (
                        <Link key={s} href={sHref} className="ec-btn-ghost min-h-[36px] text-xs">
                          {s}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
