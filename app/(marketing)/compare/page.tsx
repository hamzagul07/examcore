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
        <p className="ms-overline mb-2">Workflow</p>
        <h2 className="ec-h3 mb-5 text-[var(--ec-text-primary)]">Marking workflow</h2>
        <div className="compare-table-card">
          <div className="ms-compare-scroll overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="compare-table-head">
                  <th className="px-4 py-3">Option</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Speed</th>
                  <th className="px-4 py-3">Handwriting</th>
                  <th className="px-4 py-3">Strictness</th>
                </tr>
              </thead>
              <tbody>
                {MARKING_ROWS.map((r) => (
                  <tr
                    key={r.name}
                    className={`compare-table-row${r.name.startsWith('MarkScheme') ? ' compare-table-row--self' : ''}`}
                  >
                    <td className="px-4 py-3.5 font-semibold text-[var(--ec-text-primary)]">
                      {r.name}
                    </td>
                    <td className="px-4 py-3.5">{r.cost}</td>
                    <td className="px-4 py-3.5">{r.speed}</td>
                    <td className="px-4 py-3.5">{r.handwriting}</td>
                    <td className="px-4 py-3.5">{r.strictness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <p className="ms-overline mb-2 mt-8">Platforms</p>
        <h2 className="ec-h3 mb-5 text-[var(--ec-text-primary)]">
          Revision platforms (marking + courses)
        </h2>
        <div className="compare-table-card">
          <div className="ms-compare-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="compare-table-head">
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Best for</th>
                  <th className="px-4 py-3">Marking</th>
                  <th className="px-4 py-3">Courses / notes</th>
                  <th className="px-4 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_ROWS.map((r) => (
                  <tr
                    key={r.name}
                    className={`compare-table-row${r.name === 'MarkScheme' ? ' compare-table-row--self' : ''}`}
                  >
                    <td className="px-4 py-3.5 font-semibold text-[var(--ec-text-primary)]">
                      {r.name}
                    </td>
                    <td className="px-4 py-3.5">{r.bestFor}</td>
                    <td className="px-4 py-3.5">{r.marking}</td>
                    <td className="px-4 py-3.5">{r.courses}</td>
                    <td className="px-4 py-3.5">{r.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <section className="compare-seo-faq" aria-labelledby="compare-faq-heading">
          <p className="ms-overline mb-2 mt-8">Questions</p>
          <h2 id="compare-faq-heading" className="ec-h3 mb-5 text-[var(--ec-text-primary)]">
            Frequently asked questions
          </h2>
          <dl className="space-y-3">
            {COMPARE_SEO_FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface)] px-5 py-4"
              >
                <dt className="text-body font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </MarketingSection>
      <MarketingSection className="!pt-0">
        <div className="rounded-3xl border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] px-6 py-10 text-center sm:px-10">
          <h2 className="ec-h3 text-[var(--ec-text-primary)]">
            See it on your own handwriting
          </h2>
          <p className="mx-auto mt-2 max-w-md text-body text-[var(--ec-text-secondary)]">
            One free question, marked against the official scheme — the fastest way
            to compare is to try it.
          </p>
          <Link href="/mark" className="ec-btn-primary mt-6 inline-flex">
            Mark a question free →
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
