import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, itemListNode } from '@/lib/seo/structured-data'
import { COMPARE_SEO_FAQ } from '@/lib/seo/compare-seo'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/compare')

const MARKING_ROWS = [
  {
    name: 'Self-mark with official mark scheme',
    cost: 'Free',
    speed: 'Slow',
    handwriting: 'N/A',
    strictness: 'Often too generous',
  },
  {
    name: 'MarkScheme (second pass)',
    cost: 'Free tier',
    speed: '~30s per question',
    handwriting: 'Yes — photo upload',
    strictness: 'Scheme- / markband-aligned',
  },
  {
    name: 'Private tutor',
    cost: 'High',
    speed: 'Days to weeks',
    handwriting: 'Sometimes',
    strictness: 'Depends on tutor',
  },
]

const PLATFORM_ROWS = [
  {
    name: 'MarkScheme',
    bestFor: 'Marking handwriting + free Cambridge & IB courses',
    marking: 'Cambridge schemes + IB markbands',
    courses: 'Yes — /courses and /ib/courses',
    cost: 'Free tier',
  },
  {
    name: 'Save My Exams',
    bestFor: 'Paid all-in-one notes & topic questions',
    marking: 'Limited AI on short answers',
    courses: 'Notes & questions (subscription)',
    cost: 'Freemium / paid',
  },
  {
    name: 'Physics & Maths Tutor',
    bestFor: 'Free STEM notes & past-paper PDFs',
    marking: 'Self-mark with PDF schemes only',
    courses: 'Notes, not full lessons',
    cost: 'Free',
  },
  {
    name: 'ZNotes',
    bestFor: 'Concise free notes across subjects',
    marking: 'None',
    courses: 'Summary notes',
    cost: 'Free',
  },
  {
    name: 'Revision Village (IB)',
    bestFor: 'IB Maths AA/AI question banks',
    marking: 'Worked solutions, not your handwriting',
    courses: 'Video + questions (paid tiers)',
    cost: 'Freemium / paid',
  },
  {
    name: 'ChatGPT / generic AI',
    bestFor: 'Explaining concepts',
    marking: 'Not tied to session mark schemes',
    courses: 'No syllabus structure',
    cost: 'Varies',
  },
]

export default function ComparePage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/compare"
        title="Compare Cambridge & IB marking and revision tools"
        description="Self-marking, MarkScheme, tutors, Save My Exams, PMT, ZNotes, and IB platforms compared for handwriting upload, courses, and scheme-aligned feedback."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
        ]}
      />
      <JsonLd
        data={[
          itemListNode({
            name: 'Cambridge and IB past paper marking options',
            items: [...MARKING_ROWS, ...PLATFORM_ROWS].map((r) => ({ name: r.name })),
          }),
          faqPageNode(COMPARE_SEO_FAQ, { speakableSelectors: ['.compare-seo-faq'] }),
        ]}
      />
      <MarketingHero
        label="COMPARISON"
        title="Which marking path fits you?"
        lead="Not affiliate fluff — practical tables for Cambridge and IB students revising with past papers, mark schemes, and free courses."
      />
      <MarketingSection className="!pt-0">
        <h2 className="ec-h3 mb-4 text-[var(--ec-text-primary)]">Marking workflow</h2>
        <div className="ms-compare-scroll overflow-x-auto">
          <table className="ec-blog-prose w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr>
                <th className="pb-3 pr-4">Option</th>
                <th className="pb-3 pr-4">Cost</th>
                <th className="pb-3 pr-4">Speed</th>
                <th className="pb-3 pr-4">Handwriting</th>
                <th className="pb-3">Strictness</th>
              </tr>
            </thead>
            <tbody>
              {MARKING_ROWS.map((r) => (
                <tr key={r.name} className="border-t border-[var(--ec-border)]">
                  <td className="py-3 pr-4 font-semibold text-[var(--ec-text-primary)]">
                    {r.name}
                  </td>
                  <td className="py-3 pr-4">{r.cost}</td>
                  <td className="py-3 pr-4">{r.speed}</td>
                  <td className="py-3 pr-4">{r.handwriting}</td>
                  <td className="py-3">{r.strictness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="landing-lead mt-8">
          Best workflow: self-mark strictly once, then{' '}
          <Link href="/mark" className="ec-link font-semibold">
            MarkScheme
          </Link>{' '}
          on the same script for a second pass before your next paper.
        </p>
      </MarketingSection>
      <MarketingSection className="!pt-0">
        <h2 className="ec-h3 mb-4 text-[var(--ec-text-primary)]">
          Revision platforms (marking + courses)
        </h2>
        <div className="ms-compare-scroll overflow-x-auto">
          <table className="ec-blog-prose w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr>
                <th className="pb-3 pr-4">Platform</th>
                <th className="pb-3 pr-4">Best for</th>
                <th className="pb-3 pr-4">Marking</th>
                <th className="pb-3 pr-4">Courses / notes</th>
                <th className="pb-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_ROWS.map((r) => (
                <tr key={r.name} className="border-t border-[var(--ec-border)]">
                  <td className="py-3 pr-4 font-semibold text-[var(--ec-text-primary)]">
                    {r.name}
                  </td>
                  <td className="py-3 pr-4">{r.bestFor}</td>
                  <td className="py-3 pr-4">{r.marking}</td>
                  <td className="py-3 pr-4">{r.courses}</td>
                  <td className="py-3">{r.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="landing-lead mt-8">
          Deep dives:{' '}
          <Link href="/blog/best-online-tools-cambridge-ib-marking-courses-2026" className="ec-link font-semibold">
            best online tools for Cambridge &amp; IB
          </Link>
          ,{' '}
          <Link href="/blog/best-free-cambridge-revision-resources-2026" className="ec-link font-semibold">
            free Cambridge resources
          </Link>
          ,{' '}
          <Link href="/blog/best-free-ib-revision-resources-2026" className="ec-link font-semibold">
            free IB resources
          </Link>
          .
        </p>
      </MarketingSection>
      <MarketingSection className="!pt-0">
        <section className="compare-seo-faq mx-auto max-w-3xl" aria-labelledby="compare-faq-heading">
          <h2 id="compare-faq-heading" className="ec-h3 mb-4 text-[var(--ec-text-primary)]">
            Frequently asked questions
          </h2>
          <dl className="space-y-4 text-sm">
            {COMPARE_SEO_FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                <dd className="mt-1 leading-relaxed text-[var(--ec-text-secondary)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </MarketingSection>
    </MarketingPageShell>
  )
}
