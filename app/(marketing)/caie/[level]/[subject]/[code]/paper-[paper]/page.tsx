import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  normalizePaperNumber,
} from '@/lib/seo/caie-graph'

type Props = {
  params: Promise<{ level: string; subject: string; code: string; paper: string }>
}

export function generateStaticParams() {
  const out: Array<{ level: string; subject: string; code: string; paper: string }> = []
  for (const hub of getAllCaieHubParams()) {
    const papers = new Set<string>()
    for (const lesson of getCourseLessons(hub.code)) {
      if (!isIndexableLesson(lesson)) continue
      const n = normalizePaperNumber(lesson.paper)
      if (n) papers.add(n)
    }
    for (const paper of papers) {
      out.push({ ...hub, paper })
    }
  }
  return out
}

export async function generateMetadata({ params }: Props) {
  const { level, subject, code, paper } = await params
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

export default async function CaiePaperHubPage({ params }: Props) {
  const { level, subject, code, paper } = await params
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
