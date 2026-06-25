import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { ProgrammaticHubGrid } from '@/components/seo/ProgrammaticHubGrid'
import {
  getCambridgeTopicHubSubjects,
  getCambridgeTopicPageCount,
} from '@/lib/seo/topic-practice-hub'

const PATH = '/past-papers/topics'

export const metadata = getPageMetadata(PATH, {
  title: 'Cambridge past paper questions by topic — practise & mark',
  description:
    'Browse Cambridge A-Level, AS, and O-Level past-paper questions organised by syllabus topic. Each page links to instant marking against the official mark scheme.',
  keywords: [
    'Cambridge past paper questions by topic',
    'A Level topic questions',
    'past paper practice by topic',
    'Cambridge topic revision',
    '9709 topic questions',
  ],
})

export default function CambridgeTopicPracticeHubPage() {
  const subjects = getCambridgeTopicHubSubjects()
  const totalTopics = getCambridgeTopicPageCount()

  const faqs = [
    {
      q: 'What are topic question pages?',
      a: 'Each page collects recent Cambridge past-paper questions tagged to one syllabus topic — so you can drill a weak area without sitting a full paper first.',
    },
    {
      q: 'How are answers marked?',
      a: 'Upload a photo of your working and MarkScheme scores it against the real mark scheme for that question — method marks, accuracy, and essay bands included.',
    },
    {
      q: 'Which syllabuses have topic pages?',
      a: `${subjects.length} Cambridge syllabuses with ${totalTopics}+ topic pages where our question bank has enough tagged items.`,
    },
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Cambridge past paper questions by topic"
        description="Topic-organised Cambridge past-paper practice with mark-scheme marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Past papers', path: '/past-papers' },
          { name: 'By topic', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'Cambridge topic practice',
            description: `${totalTopics}+ topic question pages across ${subjects.length} syllabuses.`,
            hasPart: subjects.flatMap((s) =>
              s.topics.slice(0, 8).map((t) => ({
                name: `${s.code}: ${t.title}`,
                url: `${SITE_URL}${t.path}`,
              }))
            ),
          }),
          itemListNode({
            name: 'Syllabuses with topic practice',
            items: subjects.map((s) => ({
              name: `${s.code} ${s.label}`,
              url: `${SITE_URL}/past-papers/${s.code}`,
            })),
          }),
          faqPageNode(faqs),
        ]}
      />

      <MarketingHero
        label="Cambridge"
        title={
          <>
            Past paper questions <em>by topic</em>
          </>
        }
        lead={`${totalTopics}+ topic pages across ${subjects.length} syllabuses. Drill one concept, mark against the official scheme, then move to full papers when ready.`}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/past-papers" className="ec-btn-primary ec-btn-primary--sm">
            All past papers <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/mark" className="ec-btn-ghost ec-btn-ghost--sm">
            Mark a question
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <ProgrammaticHubGrid
          items={subjects.map((s) => ({
            code: s.code,
            title: `${s.label} topics`,
            subtitle: `${s.topicCount} syllabus points with past-paper questions`,
            href: `/past-papers/${s.code}`,
            meta: 'View topic grid on subject page',
          }))}
        />

        {subjects.map((subject) => (
          <div key={subject.code} className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ms-overline">{subject.code}</p>
                <h2 className="ms-h3" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
                  {subject.label}{' '}
                  <span className="text-[var(--ec-text-faint)]">· {subject.topicCount} topics</span>
                </h2>
              </div>
              <Link
                href={subject.hubPath}
                className="ec-btn-underline inline-flex items-center gap-1 text-sm"
              >
                <BookOpen className="h-4 w-4" />
                {subject.code} hub
              </Link>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {subject.topics.map((topic) => (
                <li key={topic.path}>
                  <Link href={topic.path} className="ms-hub-card block px-4 py-3 text-sm">
                    <span className="block font-medium text-[var(--ec-text-primary)]">
                      {topic.title}
                    </span>
                    <span className="ms-micro mt-1 text-[var(--ec-text-faint)]">
                      {topic.questionCount} questions
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </MarketingSection>
    </MarketingPageShell>
  )
}
