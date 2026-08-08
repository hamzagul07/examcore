import Link from 'next/link'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { WillMyGradeHold } from '@/components/tools/WillMyGradeHold'
import { EdexcelWrongBoardBridge } from '@/components/seo/EdexcelWrongBoardBridge'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'
import {
  getGradeBoundaryCalculatorPages,
  isValidMarkingSubjectCode,
} from '@/lib/seo/programmatic-subjects'

type Props = { searchParams: Promise<{ code?: string }> }

export const metadata = getPageMetadata('/tools/will-my-grade-hold', {
  title: 'Will my grade hold? — Cambridge raw mark checker',
  description:
    'Paste your Cambridge raw mark and published thresholds. See your grade, the gap to the next boundary, and get the free November mock pack. Results Day 2026 tool.',
  keywords: [
    'will my grade hold',
    'Cambridge grade calculator',
    'raw mark to grade',
    'A Level results 2026',
  ],
})

const FAQS = [
  {
    q: 'Can this tool guarantee my Cambridge grade?',
    a: 'No. It applies the thresholds you enter (or the latest verified table we have) to your raw mark. Official grades come from Cambridge via your centre. Always confirm against your statement of results.',
  },
  {
    q: 'When should I use Will my grade hold?',
    a: 'On and after Results Day once thresholds are public, or beforehand with recent-session boundaries as an estimate. It is especially useful when you are one or two marks from a boundary and deciding on a remark.',
  },
  {
    q: 'I sit Edexcel International — does this tool apply?',
    a: 'No. This checker is for Cambridge raw-mark thresholds. Edexcel International A Level Maths uses unit UMS and cash-in combinations. Use the IAL UMS explainer and mark practice on board=edexcel instead.',
  },
]

export default async function WillMyGradeHoldPage({ searchParams }: Props) {
  const { code: rawCode } = await searchParams
  const code =
    rawCode && isValidMarkingSubjectCode(rawCode) ? rawCode : null
  const subject = code
    ? getGradeBoundaryCalculatorPages().find((s) => s.code === code) ?? null
    : null
  const official = code ? getOfficialBoundaries(code) : null
  const path = '/tools/will-my-grade-hold'
  const level =
    subject?.levels.includes('AS-Level') && !subject.levels.includes('A-Level')
      ? 'AS-Level'
      : 'A-Level'

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title="Will my grade hold?"
        description="Check Cambridge raw marks against grade boundaries."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Will my grade hold?', path },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <MarketingHero
        label="Results Day tool"
        title="Will my grade hold?"
        lead="Enter your raw mark and the published thresholds for your component. See the grade, the gap to the next boundary, then capture the November mock pack."
      >
        <p className="ms-body-2 mt-4">
          Coming from Results Day?{' '}
          <Link href="/results-2026" className="underline">
            Open the 2026 hub
          </Link>
          {code ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/results-2026/caie/${code}`} className="underline">
                {code} page
              </Link>
            </>
          ) : null}
        </p>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <WillMyGradeHold
          code={code}
          subjectLabel={subject?.label ?? null}
          official={official}
          defaultLevel={level}
        />
        <EdexcelWrongBoardBridge />
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">FAQ</h2>
        <dl className="mt-6 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="ec-card p-5">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="ms-body-2 mt-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </MarketingSection>
    </MarketingPageShell>
  )
}
