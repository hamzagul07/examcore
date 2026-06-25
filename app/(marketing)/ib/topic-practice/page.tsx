import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { ContentHubNav } from '@/components/content/ContentHubNav'
import {
  getIbTopicHubSubjects,
  getIbTopicPageCount,
} from '@/lib/seo/topic-practice-hub'
import { getIbSubject } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'

const PATH = '/ib/topic-practice'

export const metadata = getPageMetadata(PATH, {
  title: 'IB topic practice — syllabus-by-syllabus revision & marking',
  description:
    'Drill every IB Diploma syllabus point with free lessons, flashcards, and criterion-based practice marking. Browse 760+ topic pages across HL, SL, and Core.',
  keywords: [
    'IB topic practice',
    'IB syllabus revision',
    'IB criterion marking',
    'IB HL SL practice questions',
    'IB topic by topic revision',
  ],
})

export default function IbTopicPracticeHubPage() {
  const subjects = getIbTopicHubSubjects()
  const totalTopics = getIbTopicPageCount()

  const faqs = [
    {
      q: 'What is IB topic practice on MarkScheme?',
      a: 'Each page maps one IB syllabus point to a free lesson, revision notes, and a criterion-marking task aligned to official IB assessment descriptors — so you revise and get band feedback on the same topic.',
    },
    {
      q: 'Which IB subjects have topic practice?',
      a: `We cover ${subjects.length} IB Diploma subjects with generated courses — ${totalTopics}+ individual topic pages across sciences, maths, humanities, languages, Core, and Group 6 arts.`,
    },
    {
      q: 'How is this different from past papers?',
      a: 'Past papers test whole exam components under time pressure. Topic practice isolates one syllabus point so you can fix gaps before attempting full papers.',
    },
  ]

  const allTopicItems = subjects.flatMap((s) =>
    s.topics.map((t) => ({
      name: `${s.name}: ${t.title}`,
      url: `${SITE_URL}${t.path}`,
    }))
  )

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="IB topic practice"
        description="Syllabus-by-syllabus IB Diploma revision with criterion marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'Topic practice', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'IB Diploma topic practice',
            description: `${totalTopics}+ syllabus topic pages with free lessons and criterion marking.`,
            hasPart: allTopicItems.slice(0, 120),
          }),
          itemListNode({
            name: 'IB subjects with topic practice',
            items: subjects.map((s) => ({
              name: s.name,
              url: `${SITE_URL}${s.hubPath}#ib-topic-practice`,
            })),
          }),
          faqPageNode(faqs),
        ]}
      />

      <MarketingHero
        label="IB Diploma"
        title={
          <>
            Topic practice — <em>every syllabus point</em>
          </>
        }
        lead={`${totalTopics}+ pages across ${subjects.length} subjects. Revise one IB topic, then submit your response for band-by-band feedback against official criteria.`}
      >
        <ContentHubNav />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ib/courses" className="ec-btn-primary ec-btn-primary--sm">
            Free IB courses <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/guides/ib" className="ec-btn-ghost ec-btn-ghost--sm">
            IB study guides
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        {subjects.map((subject) => {
          const meta = getIbSubject(subject.slug)
          const accent = meta?.accent ?? 'var(--ec-brand)'
          return (
            <div key={subject.slug} className="mb-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="ms-overline">{subject.level}</p>
                  <h2 className="ms-h3" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
                    {meta ? ibShortName(meta) : subject.slug}{' '}
                    <span className="text-[var(--ec-text-faint)]">· {subject.topicCount} topics</span>
                  </h2>
                </div>
                <Link
                  href={subject.hubPath}
                  className="ec-btn-underline inline-flex items-center gap-1 text-sm"
                >
                  <BookOpen className="h-4 w-4" />
                  Past papers
                </Link>
              </div>
              <ul
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                style={{ '--sc': accent } as CSSProperties}
              >
                {subject.topics.map((topic) => (
                  <li key={topic.path}>
                    <Link
                      href={topic.path}
                      className="ms-hub-card block px-4 py-3 text-sm hover:border-[var(--sc)]"
                    >
                      <span className="ms-micro text-[var(--ec-text-faint)]">{topic.topicCode}</span>
                      <span className="mt-1 block font-medium text-[var(--ec-text-primary)]">
                        {topic.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </MarketingSection>
    </MarketingPageShell>
  )
}
