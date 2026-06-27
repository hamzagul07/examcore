import Link from 'next/link'
import { ArrowRight, Calculator, BookText, GraduationCap, Percent, Timer } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { softwareApplicationNode } from '@/lib/seo/structured-data'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'

const PATH = '/tools'

type ToolCard = {
  href: string
  title: string
  description: string
  cta: string
  icon: typeof Calculator
}

const TOOLS: ToolCard[] = [
  {
    href: '/tools/grade-boundary-calculator',
    title: 'Grade boundary calculator',
    description:
      'Enter your raw marks and the official thresholds to see your Cambridge A*–E grade, your percentage, and the marks needed for the next grade up. Per-subject calculators for every syllabus we mark.',
    cta: 'Open calculator',
    icon: Calculator,
  },
  {
    href: '/tools/command-words',
    title: 'Command words explorer',
    description:
      'What every Cambridge command word — state, explain, evaluate, justify — actually asks for, and how to answer it to earn the marks. Searchable, with per-subject profiles.',
    cta: 'Explore command words',
    icon: BookText,
  },
  {
    href: '/tools/ib-points-calculator',
    title: 'IB points calculator',
    description:
      'Add up your IB Diploma score out of 45 — six subjects (1–7) plus the Theory of Knowledge and Extended Essay bonus — and check whether you meet the pass conditions.',
    cta: 'Calculate IB points',
    icon: GraduationCap,
  },
  {
    href: '/tools/pum-calculator',
    title: 'PUM / UMS calculator',
    description:
      'Convert a raw mark to a Percentage Uniform Mark on the 0–100 scale using your A–E thresholds — see your grade and how many marks reach the next one.',
    cta: 'Convert to PUM',
    icon: Percent,
  },
  {
    href: '/tools/exam-countdown',
    title: 'Exam countdown & planner',
    description:
      'Enter your exam date to see days and weeks left, the revision phase you should be in, and how many past papers a week to clear your target — for any session.',
    cta: 'Start the countdown',
    icon: Timer,
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Free revision tools — Cambridge grade & command words',
  description:
    'Free Cambridge revision tools: a grade boundary calculator that turns raw marks into an A*–E grade, and a command words explorer that shows how to answer each question type.',
  keywords: [
    'Cambridge revision tools',
    'grade boundary calculator',
    'command words',
    'raw marks to grade',
    'free A-Level tools',
  ],
})

export default function ToolsHubPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Free Cambridge revision tools"
        description="Free tools for Cambridge students — grade boundary calculator and command words explorer."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: PATH },
        ]}
      />
      <JsonLd data={[softwareApplicationNode()]} />

      <MarketingHero
        label="Free tools"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: PATH },
        ]}
        title="Free revision tools for Cambridge students"
        lead="Quick, no-sign-up tools to check where you stand and answer questions the way examiners want — built from the same mark schemes we use to mark full papers."
      />

      <MarketingSection className="!pt-0">
        <ul className="ms-guide-grid sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <li key={tool.href}>
                <Link href={tool.href} className="ms-hub-card" style={{ display: 'block' }}>
                  <span className="ec-chip ec-chip-accent" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="ms-h3" style={{ marginTop: 12, fontSize: '1.15rem' }}>
                    {tool.title}
                  </h2>
                  <p className="ms-body-2" style={{ marginTop: 8 }}>
                    {tool.description}
                  </p>
                  <span className="ec-btn-underline mt-3 inline-flex items-center gap-1 text-sm">
                    {tool.cta} <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Want feedback on the actual answer, not just a grade?</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 500 }}>
            A grade estimate tells you where you landed. MarkScheme tells you <em>why</em> — upload
            your paper and get mark-by-mark feedback against the real Cambridge scheme.
          </p>
          <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
            Mark a paper free <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="ms-micro mt-6">
            Looking for written guides instead?{' '}
            <Link href="/guides" className="ec-btn-underline">
              Browse all revision guides
            </Link>
            .
          </p>
        </div>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
