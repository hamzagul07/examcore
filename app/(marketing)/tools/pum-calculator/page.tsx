import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { PumConverter } from '@/components/tools/PumConverter'

const PATH = '/tools/pum-calculator'

const FAQS = [
  {
    q: 'What is a Percentage Uniform Mark (PUM)?',
    a: 'A PUM is a raw mark converted onto a fixed 0–100 scale so grades mean the same thing across sessions and components. The grade thresholds are pinned to set values — A=80, B=70, C=60, D=50, E=40 — with full marks at 100 and zero at 0.',
  },
  {
    q: 'How do I convert raw marks to UMS / PUM?',
    a: 'Take your raw mark, the component total, and the A–E raw-mark thresholds for your session. Between two thresholds the scale is linear, so a mark part way through a grade band converts to a PUM part way between the two anchor values. Enter them above and the tool does the interpolation.',
  },
  {
    q: 'Why is my PUM different from my raw percentage?',
    a: 'Because the scale is anchored to grade boundaries, not to the raw total. If an A needs 60 out of 75 (80% raw) the A is still pinned to 80 PUM, but a harder paper where an A needs 55/75 (73% raw) also maps to 80 PUM — so your PUM reflects the grade standard, not the raw percentage.',
  },
  {
    q: 'Is PUM the same as UMS?',
    a: 'They are the same idea — a uniform mark scale that standardises grades across sessions. UK boards usually call it UMS (often out of a fixed maximum per unit); Cambridge International reports a Percentage Uniform Mark (PUM) on a 0–100 scale. This tool uses the 0–100 PUM model.',
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Cambridge PUM / UMS calculator (raw marks → uniform mark)',
  description:
    'Free Cambridge PUM/UMS calculator: enter your raw mark, the total, and the A–E thresholds to convert to a Percentage Uniform Mark on the 0–100 scale.',
  keywords: [
    'PUM calculator',
    'UMS calculator',
    'percentage uniform mark',
    'raw marks to UMS',
    'Cambridge uniform mark',
    'convert raw marks to PUM',
  ],
})

export default function PumCalculatorPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Cambridge PUM / UMS calculator"
        description="Convert a raw mark to a Percentage Uniform Mark (PUM/UMS) on the 0–100 scale using the A–E grade thresholds."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'PUM / UMS calculator', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <MarketingHero
        label="Free tool"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'PUM / UMS calculator', path: PATH },
        ]}
        title="Cambridge PUM / UMS calculator"
        lead="Convert a raw mark into a Percentage Uniform Mark on the 0–100 scale. Enter your mark, the total, and the A–E thresholds for your session — get your PUM, your grade, and the marks to the next grade."
      />

      <MarketingSection className="!pt-0">
        <PumConverter />

        <div className="mt-12 max-w-2xl">
          <h2 className="ms-h3">How the uniform mark scale works</h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            A raw mark on its own doesn&apos;t mean the same thing from session to session, because
            papers vary in difficulty. The uniform mark scale fixes each grade boundary to a set
            value — A=80, B=70, C=60, D=50, E=40 — and interpolates linearly in between, with full
            marks at 100 and zero at 0. That way a B is a B whether the raw boundary was 53 or 58.
            A* (PUM 90) is awarded on the overall subject aggregate, not on a single component, so
            this component-level tool uses the published A–E thresholds.
          </p>
          <p className="ms-body-2" style={{ marginTop: 12 }}>
            New to the term? Read{' '}
            <Link
              href="/blog/cambridge-pum-percentage-uniform-marks-explained-2026"
              className="ec-btn-underline"
            >
              Percentage Uniform Marks explained
            </Link>{' '}
            for the full picture.
          </p>
        </div>

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Want to know where each mark went?</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            A PUM tells you the grade. MarkScheme shows you <em>why</em> — upload your paper for
            mark-by-mark feedback against the real Cambridge scheme.
          </p>
          <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
            Mark a paper free <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="ms-micro mt-6">
            More tools:{' '}
            <Link href="/tools/grade-boundary-calculator" className="ec-btn-underline">
              grade boundary calculator
            </Link>{' '}
            ·{' '}
            <Link href="/tools" className="ec-btn-underline">
              all free tools
            </Link>
          </p>
        </div>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
