import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { CommandWordExplorer } from '@/components/tools/CommandWordExplorer'
import { getCommandWords } from '@/lib/seo/command-words'

const PATH = '/tools/command-words'

const FAQS = [
  {
    q: 'What are command words in Cambridge exams?',
    a: 'Command words are the instructing verbs at the start of a question — like State, Explain, Discuss or Evaluate. They tell you the depth of answer the examiner expects, not just the topic. Reading them correctly is one of the fastest ways to stop losing marks.',
  },
  {
    q: 'What is the difference between describe and explain?',
    a: 'Describe means state the main features or points without reasons — say what happens. Explain means give the reasons or causes — say why and how it happens, making relationships clear. Explaining when asked to describe wastes time; describing when asked to explain loses marks.',
  },
  {
    q: 'What does evaluate mean in a Cambridge exam?',
    a: 'Evaluate means weigh up the strengths and weaknesses, or arguments for and against, then reach a supported conclusion. To hit the top band you must include a justified judgement — points on both sides with no conclusion stay mid-band.',
  },
  {
    q: 'Why do I lose marks when my content is correct?',
    a: 'Usually because you answered the wrong command word. Examiner reports cite command-word misreading every series. The fix is not more content — it is matching your answer to what the verb demands, then marking it against the official scheme.',
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Cambridge command words explainer',
  description:
    'A free, searchable guide to every Cambridge command word — State, Explain, Analyse, Discuss, Evaluate, Justify — with what examiners reward and the mistakes to avoid.',
  keywords: [
    'Cambridge command words',
    'command words meaning',
    'command words A Level',
    'explain vs describe',
    'evaluate command word',
  ],
})

export default function CommandWordsToolPage() {
  const words = getCommandWords()
  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Cambridge command words explainer"
        description="Every Cambridge command word with examiner-accurate meanings and common mistakes."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools/command-words' },
          { name: 'Command words', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <MarketingHero
        label="Free tool"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Command words', path: PATH },
        ]}
        title="Cambridge command words explainer"
        lead="Every command word Cambridge uses, what the examiner actually wants for each, and the mistake that costs marks. Search the verb in your question and answer to the right depth."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
            Mark your answer free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/blog/cambridge-command-words-explained" className="ec-btn-ghost ec-btn-ghost--sm">
            Read the full guide
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <CommandWordExplorer words={words} />

        <p className="ms-micro mt-8">
          <Link href="/guides/command-words" className="ec-btn-underline">
            Per-subject command word pages
          </Link>
          {' · '}
          <Link href="/blog/cambridge-command-words-explained" className="ec-btn-underline">
            Full guide
          </Link>
        </p>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
