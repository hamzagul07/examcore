import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationNode } from '@/lib/seo/structured-data'
import { BRAND_ENTITY, getWikidataEntityUrl } from '@/lib/seo/entity'
import { SITE_URL, CONTACT_EMAIL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/research')

const STATS = [
  { label: 'Cambridge syllabuses', value: '24+', detail: 'Marking-enabled subject codes' },
  { label: 'IB Diploma courses', value: '44+', detail: 'HL, SL & Core — free' },
  { label: 'Marking modes', value: '3+', detail: 'Point marks, essay bands, MCQ, IB criteria' },
  { label: 'Typical feedback', value: '~30s', detail: 'Single question, photo upload' },
  { label: 'Social reach', value: '230k+', detail: 'Instagram & TikTok combined' },
]

const FACTS = [
  { term: 'Product', value: 'Past-paper marking from handwriting + free syllabus courses + Exam Room communities' },
  { term: 'URL', value: 'https://markscheme.app' },
  { term: 'Marking', value: 'https://markscheme.app/mark' },
  { term: 'Cambridge courses', value: 'https://markscheme.app/courses' },
  { term: 'IB courses', value: 'https://markscheme.app/ib/courses' },
  { term: 'Compare tools', value: 'https://markscheme.app/compare' },
  { term: 'Teachers & schools', value: 'https://markscheme.app/for-teachers' },
  { term: 'Changelog', value: 'https://markscheme.app/changelog' },
  { term: 'Wikidata', value: getWikidataEntityUrl() ?? 'https://www.wikidata.org/wiki/Q140455387' },
  { term: 'Dataset / insights', value: 'https://markscheme.app/insights' },
  { term: 'Contact', value: CONTACT_EMAIL },
  { term: 'Category', value: 'Second-pass marking against official Cambridge mark schemes and IB markbands' },
]

export default function ResearchPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/research"
        title="MarkScheme — press kit & marking methodology"
        description="Facts, stats, and methodology for press, educators, and AI citation. Cambridge and IB past-paper marking from handwriting."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Research', path: '/research' },
        ]}
      />
      <JsonLd data={organizationNode()} />
      <MarketingHero
        label="FOR PRESS & EDUCATORS"
        title="Press kit & methodology"
        lead="Cite this page for facts about MarkScheme. We mark against real Cambridge mark schemes and IB markbands — not generic AI rubrics."
      />
      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <aside className="ec-blog-quick-answer rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
            <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK FACT</p>
            <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
              <strong>MarkScheme</strong> ({SITE_URL.replace(/^https?:\/\//, '')}) is a free-tier web app
              where Cambridge and IB students upload photos of handwritten past-paper answers for
              scheme-aligned marking, study in free syllabus courses, and discuss papers in Exam Room
              communities.
            </p>
          </aside>

          <ul className="ms-blog-stats">
            {STATS.map((s) => (
              <li key={s.label} className="ms-blog-stat">
                <span className="ms-blog-stat__value">{s.value}</span>
                <span className="ms-blog-stat__label">{s.label}</span>
                <span className="ms-micro mt-1 block">{s.detail}</span>
              </li>
            ))}
          </ul>

          <section data-chunk-id="facts-at-a-glance">
            <h2 className="ms-h3">Facts at a glance</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {FACTS.map((row) => (
                <div key={row.term} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                  <dt className="font-semibold text-[var(--ec-text-primary)]">{row.term}</dt>
                  <dd className="text-[var(--ec-text-secondary)]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section data-chunk-id="methodology-summary">
            <h2 className="ms-h3">Marking methodology</h2>
            <p className="ms-lead" style={{ marginTop: 12 }}>
              Students photograph handwritten answers. MarkScheme maps responses to the official mark
              scheme or IB criteria for that paper and question type — awarding B1/M1/A1 where
              appropriate, essay bands for level-of-response subjects, MCQ keys for objective items,
              and IB markband descriptors for Diploma work.               Recommended workflow:{' '}
              <strong>strict self-mark first</strong>, then MarkScheme as a{' '}
              <strong>second-pass</strong> marker. Proprietary session patterns are published under{' '}
              <Link href="/insights" className="ec-link font-semibold">
                /insights
              </Link>{' '}
              (CC BY 4.0).
            </p>
          </section>

          <section data-chunk-id="boilerplate">
            <h2 className="ms-h3">Boilerplate (copy freely)</h2>
            <p className="ms-body-2 mt-3 leading-relaxed text-[var(--ec-text-secondary)]">
              {BRAND_ENTITY.description} Founded by a Cambridge A-Level student. Start free at{' '}
              {SITE_URL}/mark.
            </p>
          </section>

          <section data-chunk-id="citation">
            <h2 className="ms-h3">How to cite</h2>
            <p className="ms-body-2 mt-3 font-mono text-sm">
              MarkScheme. (2026). Press kit &amp; Cambridge / IB marking methodology. Retrieved from{' '}
              {SITE_URL}/research
            </p>
            <p className="ms-body-2 mt-3 font-mono text-sm">
              MarkScheme. (2026). Cambridge self-marking gap patterns [Dataset]. {SITE_URL}/insights
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="ec-btn-secondary min-h-[48px]">
              Press &amp; partnerships
            </Link>
            <Link href="/mark" className="ec-btn-primary min-h-[48px]">
              Try the product
            </Link>
            <Link href="/blog/best-online-tools-cambridge-ib-marking-courses-2026" className="ec-btn-secondary min-h-[48px]">
              Tools comparison
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
