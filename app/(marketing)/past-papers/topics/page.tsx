import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode, faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
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
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Past papers', path: '/past-papers' },
          { name: 'By topic', path: PATH },
        ]}
        title={
          <>
            Past paper questions <em>by topic</em>
          </>
        }
        lead={`${totalTopics}+ topic pages across ${subjects.length} syllabuses. Pick your syllabus — topic grids live on each past-papers page.`}
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
            title: `${s.label}`,
            subtitle: `${s.topicCount} topic pages`,
            href: `/past-papers/${s.code}`,
            meta: 'Open syllabus → browse topics',
          }))}
        />
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
