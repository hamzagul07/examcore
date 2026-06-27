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
import { ExamCountdown } from '@/components/tools/ExamCountdown'

const PATH = '/tools/exam-countdown'

const FAQS = [
  {
    q: 'When should I start doing past papers?',
    a: 'Start topic-by-topic past-paper questions as soon as you have covered a topic. Move to full timed papers roughly four weeks out, once most of the syllabus is covered. The countdown above flags which phase you are in based on your exam date.',
  },
  {
    q: 'How many past papers should I do?',
    a: 'There is no magic number, but a useful target is every paper from the last three to five sessions per subject, each marked strictly against the scheme. Enter your subjects and papers-each above and the tool suggests a weekly pace to clear them by exam day.',
  },
  {
    q: 'How long before exams should I start revising?',
    a: 'Serious revision usually needs 6–10 weeks, but it depends on how well you know the content. With more than ~12 weeks, prioritise understanding each topic; inside 4 weeks, shift almost entirely to timed past papers and review.',
  },
  {
    q: 'Does the countdown decay or need updating?',
    a: 'No — you enter your own exam date, so it works for any session and any subject. There are no hardcoded dates, so the plan stays accurate whenever you use it.',
  },
]

export const metadata = getPageMetadata(PATH, {
  title: 'Exam countdown & revision pacing planner',
  description:
    'Free exam countdown: enter your exam date to see days and weeks left, which revision phase you are in, and how many past papers a week to clear your target.',
  keywords: [
    'exam countdown',
    'days until exams',
    'revision planner',
    'past paper plan',
    'how many past papers per week',
    'revision timetable',
  ],
})

export default function ExamCountdownPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="Exam countdown & revision planner"
        description="Count down to your exam date and get a past-paper pacing plan for the weeks remaining."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Exam countdown', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <MarketingHero
        label="Free tool"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Exam countdown', path: PATH },
        ]}
        title="Exam countdown & revision planner"
        lead="Enter your exam date to see exactly how long is left, which revision phase you should be in, and how many past papers a week it takes to clear your target — for any subject, any session."
      />

      <MarketingSection className="!pt-0">
        <ExamCountdown />

        <div className="mt-12 max-w-2xl">
          <h2 className="ms-h3">Revision phases as the exam nears</h2>
          <p className="ms-body-2" style={{ marginTop: 10 }}>
            Good revision changes shape as time runs out. With months to go, the priority is
            understanding every topic. Inside two months, you start layering past papers on top of
            that knowledge. In the final weeks it becomes almost entirely timed papers, strict
            marking, and fixing your weakest spots — not new content. The planner tells you which
            phase your date puts you in and roughly how many papers a week keeps you on track.
          </p>
          <p className="ms-body-2" style={{ marginTop: 12 }}>
            The real gains come from <strong>marking</strong> each paper honestly against the
            scheme. For the method, see{' '}
            <Link
              href="/blog/how-to-revise-with-cambridge-past-papers"
              className="ec-btn-underline"
            >
              how to revise with past papers
            </Link>
            .
          </p>
        </div>

        <div className="ms-hub-card mt-12 text-center">
          <h2 className="ms-h3">Make every paper count</h2>
          <p className="ms-lead mx-auto" style={{ marginTop: 10, maxWidth: 480 }}>
            A plan gets you doing papers. MarkScheme makes each one teach you something — upload your
            answers for mark-by-mark feedback against the real scheme.
          </p>
          <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px]">
            Mark a paper free <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="ms-micro mt-6">
            More tools:{' '}
            <Link href="/tools" className="ec-btn-underline">
              all free revision tools
            </Link>
            .
          </p>
        </div>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
