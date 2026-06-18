import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { GradeBoundaryCalculator } from '@/components/tools/GradeBoundaryCalculator'
import { getMarkingSubjectPages, buildSubjectPageCopy } from '@/lib/seo/programmatic-subjects'

const PATH = '/tools/grade-boundary-calculator'

const FAQS = [
  {
    q: 'How do I work out my Cambridge grade from raw marks?',
    a: 'Find your raw mark, the paper or aggregate total, and the grade thresholds for your session. Enter them above and the calculator returns your grade, your percentage, and how many marks you are from the next grade up. Boundaries are raw marks, not fixed percentages.',
  },
  {
    q: 'Where do I find the official grade boundaries?',
    a: 'Cambridge publishes a grade threshold table for every syllabus and session on results day, on the Cambridge International website under Grade threshold tables. Your school exams officer also receives them. June 2026 thresholds are released on 13 August 2026.',
  },
  {
    q: 'Are these the real 2026 grade boundaries?',
    a: 'No — you enter the boundaries yourself, so the result is always based on real, official numbers rather than a guess. The 2026 thresholds are not published until results day, so before then you can estimate using the most recent two or three sessions for your components.',
  },
  {
    q: 'Why does the boundary for an A change every year?',
    a: 'Cambridge sets boundaries after marking so a grade means the same standard each year. If a paper is harder than usual the boundary drops; if easier it rises. That is why an A might need 65% one session and 72% another — always check the table for your session.',
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Cambridge grade boundary calculator (raw marks → grade)',
  description:
    'Free Cambridge grade calculator: enter your raw marks and the official thresholds to see your A*–E grade, your percentage, and the marks needed for the next grade.',
  keywords: [
    'Cambridge grade boundary calculator',
    'raw marks to grade calculator',
    'grade calculator A Level',
    'Cambridge grade calculator',
    'what grade is my mark',
  ],
})

export default function GradeCalculatorPage() {
  const subjects = getMarkingSubjectPages()
    .map((s) => buildSubjectPageCopy(s))
    .slice(0, 18)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Cambridge grade boundary calculator"
        description="Convert raw marks to a Cambridge A*–E grade using official grade thresholds."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: PATH },
          { name: 'Grade boundary calculator', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <MarketingHero
        label="Free tool"
        title="Cambridge grade boundary calculator"
        lead="Turn raw marks into a Cambridge grade. Enter your mark, the total, and the official thresholds for your session — get your A*–E grade, your percentage, and exactly how many marks you need for the next grade."
      />

      <MarketingSection className="!pt-0">
        <aside className="ms-quick-answer">
          <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 8 }}>
            Quick answer
          </p>
          <p className="ms-body-2" style={{ fontSize: 16, color: 'var(--ec-text-primary)' }}>
            Cambridge grade boundaries are <strong>raw marks</strong>, set per session, not fixed
            percentages. Enter your mark and the official thresholds below for an accurate grade — then
            see how far you are from the next one.
          </p>
        </aside>

        <GradeBoundaryCalculator />

        <div className="mt-12">
          <h2 className="ms-h3">How Cambridge grade boundaries work</h2>
          <p className="ms-body-2" style={{ marginTop: 10, maxWidth: 680 }}>
            After every script is marked, Cambridge sets the boundary for each grade so that the
            standard stays consistent year on year. If a paper is harder than usual, the boundary is
            lowered; if easier, it is raised. That is why you cannot rely on “80% is always an A”. For a
            full A-Level, your grade is based on a weighted total across your components, and the A*
            additionally requires a strong A2 performance. Read the full method in our{' '}
            <Link href="/blog/how-to-read-cambridge-grade-boundaries" className="ec-btn-underline">
              guide to reading grade boundaries
            </Link>
            .
          </p>
        </div>

        <div className="mt-10">
          <p className="ms-overline">By subject</p>
          <h2 className="ms-h3" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)' }}>
            Grade calculators by syllabus
          </h2>
          <ul className="ms-guide-grid sm:grid-cols-2" style={{ marginTop: 16 }}>
            {subjects.map((s) => (
              <li key={s.path}>
                <Link
                  href={`/tools/grade-boundary-calculator/${s.path.split('/').pop()}`}
                  className="ms-hub-card"
                  style={{ display: 'block' }}
                >
                  <span className="ec-chip-ms ec-chip-ms--outline">{s.path.split('/').pop()}</span>
                  <h3 className="ms-h3" style={{ marginTop: 10, fontSize: '1.05rem' }}>
                    {s.level} grade calculator
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Want to know what each mark was worth?</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            A grade estimate tells you where you landed. MarkScheme tells you <em>why</em> — upload your
            paper and get mark-by-mark feedback against the real Cambridge scheme.
          </p>
          <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
            Mark a paper free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
