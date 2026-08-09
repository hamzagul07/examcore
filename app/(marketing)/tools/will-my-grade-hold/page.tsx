import Link from 'next/link'
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
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'
import { ToolsDeskArtefact } from '@/components/tools/ToolsDeskArtefact'

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
    <>
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

      <ToolInstrumentShell
        stamp="A*"
        label="Results Day instrument"
        title={
          <>
            Will my grade <em>hold</em>?
          </>
        }
        lead="Enter your raw mark and the published thresholds for your component. See the grade, the gap to the next boundary, then capture the November mock pack."
        note="thresholds are ink — grades are earned"
        artefact={<ToolsDeskArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Will my grade hold?', path },
        ]}
        after={
          <section className="ms-tool-instrument__faq" aria-labelledby="grade-hold-faq">
            <h2 id="grade-hold-faq" className="ms-tool-instrument__faq-title">
              FAQ
            </h2>
            <dl className="ms-tool-faq">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd className="ms-body-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        }
      >
        <ResultsDayBanner subjectCode={code} className="mb-6" />

        <p className="ms-body-2 mb-5">
          Coming from Results Day?{' '}
          <Link href="/results-2026" className="ec-link">
            Open the 2026 hub
          </Link>
          {code ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/results-2026/caie/${code}`} className="ec-link">
                {code} page
              </Link>
            </>
          ) : null}
        </p>

        <div className="ms-tool-instrument__rail" role="navigation" aria-label="Jump to a syllabus">
          <p className="ms-tool-instrument__rail-label">Syllabus</p>
          {QUICK_CODES.map((item) => {
            const active = code === item.code
            return (
              <Link
                key={item.code}
                href={`/tools/will-my-grade-hold?code=${item.code}`}
                className={`ms-tool-instrument__stamp-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.code}
              </Link>
            )
          })}
          <Link href="/guides/grade-boundaries" className="ms-tool-instrument__stamp-link">
            All
          </Link>
        </div>

        <div className="ms-tool-instrument__links">
          <Link
            href={
              code
                ? `/tools/grade-boundary-calculator/${code}`
                : '/tools/grade-boundary-calculator'
            }
            className="ec-link"
          >
            Grade boundary calculator -&gt;
          </Link>
          <Link href="/results-2026" className="ec-link">
            Results Day hub -&gt;
          </Link>
          <Link href="/guides/grade-boundaries" className="ec-link">
            2026 boundaries -&gt;
          </Link>
        </div>

        <WillMyGradeHold
          code={code}
          subjectLabel={subject?.label ?? null}
          official={official}
          defaultLevel={level}
        />
        <EdexcelWrongBoardBridge />
      </ToolInstrumentShell>
    </>
  )
}
