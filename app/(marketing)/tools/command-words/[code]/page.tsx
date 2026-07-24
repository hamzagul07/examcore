import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { CommandWordExplorer } from '@/components/tools/CommandWordExplorer'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'
import { getCommandWords } from '@/lib/seo/command-words'
import { getCommandWordsHubEntry } from '@/lib/seo/command-words-hub'
import { getCommandWordsSubjectProfile } from '@/lib/seo/command-words-subjects'
import { isValidMarkingSubjectCode } from '@/lib/seo/programmatic-subjects'
import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'

type Props = { params: Promise<{ code: string }> }

export function generateStaticParams() {
  return getMarkingSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  if (!isValidMarkingSubjectCode(code)) return {}
  const entry = getCommandWordsHubEntry(code)
  if (!entry) return {}
  return getPageMetadata(entry.toolPath, {
    title: `${code} ${entry.label} command words — Cambridge exam technique`,
    description: `Every command word that matters in Cambridge ${code} ${entry.label} (${entry.level}): what examiners reward, common mistakes, and how to mark your answers.`,
    keywords: [
      `${code} command words`,
      `Cambridge ${entry.label} command words`,
      `${code} exam technique`,
      `${code} explain vs describe`,
      `${code} evaluate questions`,
    ],
  })
}

export default async function SubjectCommandWordsPage({ params }: Props) {
  const { code } = await params
  if (!isValidMarkingSubjectCode(code)) notFound()

  const entry = getCommandWordsHubEntry(code)
  if (!entry) notFound()

  const profile = getCommandWordsSubjectProfile(code)
  const words = getCommandWords()
  const path = entry.toolPath
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Command words', path: '/tools/command-words' },
    { name: `${code} ${entry.label}`, path },
  ]

  const faqs = [
    {
      q: `What command words appear most in ${code}?`,
      a: `${entry.label} papers lean on ${profile.topVerbs.slice(0, 3).join(', ')} — but always circle the verb in each question before you plan. ${profile.paperNote}`,
    },
    {
      q: `How are ${code} answers marked?`,
      a:
        entry.markingStyle === 'bands'
          ? `Essay-style responses use level-of-response bands — command words like Evaluate and Discuss need a justified conclusion, not just points.`
          : entry.markingStyle === 'point'
            ? `Most ${code} marks are point-based — method and accuracy marks reward the working the command word implies (especially Calculate and Show that).`
            : `Mixed marking: short questions use point marks; longer responses use bands. Match depth to the verb every time.`,
    },
    {
      q: `Where can I practise ${code} questions?`,
      a: `Browse ${code} past papers, attempt timed questions, then mark against the official scheme on MarkScheme.`,
    },
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${code} ${entry.label} command words`}
        description={profile.emphasis}
        breadcrumbs={breadcrumbs}
      />
      <JsonLd data={[faqPageNode(faqs)]} />

      <MarketingHero
        label={`${code} · ${entry.level}`}
        title={
          <>
            {entry.label} <em>command words</em>
          </>
        }
        lead={profile.emphasis}
      >
        <MarketingBreadcrumbs items={breadcrumbs} className="mb-4" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/mark?subject=${code}`} className="ec-btn-primary inline-flex min-h-[48px]">
            Mark {code} free <ArrowRight className="h-5 w-5" />
          </Link>
          {entry.guideSlug ? (
            <Link href={`/blog/${entry.guideSlug}`} className="ec-btn-ghost ec-btn-ghost--sm">
              Full {code} guide
            </Link>
          ) : null}
          <Link href={entry.subjectPath} className="ec-btn-ghost ec-btn-ghost--sm">
            {code} marking hub
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <CommandWordExplorer words={words} />

        <p className="ms-micro mt-8">
          <Link href="/tools/command-words" className="ec-btn-underline">
            All command words
          </Link>
          {entry.guideSlug ? (
            <>
              {' · '}
              <Link href={`/blog/${entry.guideSlug}`} className="ec-btn-underline">
                {code} guide
              </Link>
            </>
          ) : null}
          {' · '}
          <Link href={`/past-papers/${code}`} className="ec-btn-underline">
            {code} past papers
          </Link>
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
