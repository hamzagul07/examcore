import Link from 'next/link'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { WillMyGradeHold } from '@/components/tools/WillMyGradeHold'
import { EdexcelWrongBoardBridge } from '@/components/seo/EdexcelWrongBoardBridge'
import { ResultsDayBanner } from '@/components/seo/ResultsDayBanner'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'
import {
  getGradeBoundaryCalculatorPages,
  isValidMarkingSubjectCode,
} from '@/lib/seo/programmatic-subjects'

type Props = { searchParams: Promise<{ code?: string }> }

export const metadata = getPageMetadata('/tools/will-my-grade-hold', {
  ogImagePath: '/api/og/tools/will-my-grade-hold',
  title: 'Will My Grade Hold? — Cambridge Results Day 2026 Checker',
  description:
    'Paste a Cambridge raw mark and May/June thresholds. See if your grade holds, marks to the next boundary, then get the free November mock pack.',
  keywords: [
    'will my grade hold',
    'Cambridge grade calculator',
    'raw mark to grade',
    'A Level results 2026',
    'grade boundaries 2026',
    'May June 2026 thresholds',
  ],
})

const QUICK_CODES = [
  { code: '9709', label: 'Maths' },
  { code: '9700', label: 'Biology' },
  { code: '9701', label: 'Chemistry' },
  { code: '9702', label: 'Physics' },
  { code: '9708', label: 'Economics' },
  { code: '0580', label: 'IGCSE Maths' },
  { code: '2281', label: 'O-Level Econ' },
] as const

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
        <ResultsDayBanner subjectCode={code} className="mb-10" />
        <div className="mb-6">
          <p className="ms-overline">Jump to a syllabus</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_CODES.map((item) => {
              const active = code === item.code
              return (
                <Link
                  key={item.code}
                  href={`/tools/will-my-grade-hold?code=${item.code}`}
                  className={
                    active
                      ? 'ec-btn-primary ec-btn-primary--sm'
                      : 'ec-btn-ghost ec-btn-ghost--sm'
                  }
                  aria-current={active ? 'page' : undefined}
                >
                  {item.code} · {item.label}
                </Link>
              )
            })}
            <Link href="/guides/grade-boundaries" className="ec-btn-ghost ec-btn-ghost--sm">
              All subjects
            </Link>
          </div>
        </div>
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href={
              code
                ? `/tools/grade-boundary-calculator/${code}`
                : '/tools/grade-boundary-calculator'
            }
            className="ec-btn-ghost ec-btn-ghost--sm"
          >
            Grade boundary calculator
          </Link>
          <Link href="/results-2026" className="ec-btn-ghost ec-btn-ghost--sm">
            Results Day hub
          </Link>
          <Link href="/guides/grade-boundaries" className="ec-btn-ghost ec-btn-ghost--sm">
            2026 boundaries hub
          </Link>
        </div>
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
        <dl className="ms-tool-faq mt-6">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd className="ms-body-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </MarketingSection>
    </MarketingPageShell>
  )
}
