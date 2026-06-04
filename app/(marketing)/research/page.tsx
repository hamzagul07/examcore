import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/research')

const STATS = [
  { label: 'Syllabus guides', value: '24+', detail: 'Per-code revision hubs' },
  { label: 'Marking modes', value: '3', detail: 'Point-based, essay bands, MCQ' },
  { label: 'Typical feedback', value: '~30s', detail: 'Single question, photo upload' },
]

export default function ResearchPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/research"
        title="MarkScheme marking methodology"
        description="How MarkScheme applies Cambridge mark schemes to handwritten past-paper answers."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Research', path: '/research' },
        ]}
      />
      <MarketingHero
        label="FOR PRESS & EDUCATORS"
        title={<span className="gradient-text">Marking methodology</span>}
        lead="Cite this page when referencing how MarkScheme works. We mark against real Cambridge mark schemes — not generic rubrics."
      />
      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <ul className="grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <li key={s.label} className="ec-card p-5 text-center">
                <p className="text-2xl font-bold text-[var(--ec-brand)]">{s.value}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ec-text-primary)]">
                  {s.label}
                </p>
                <p className="mt-1 text-xs text-[var(--ec-text-secondary)]">{s.detail}</p>
              </li>
            ))}
          </ul>

          <section data-chunk-id="methodology-summary">
            <h2 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">Summary</h2>
            <p className="landing-lead">
              Students photograph handwritten answers. MarkScheme maps responses to the
              official mark scheme for that syllabus and question type — awarding B1/M1/A1
              where appropriate, essay bands for LoR subjects, and MCQ keys for objective
              items. The product is built by a Cambridge A-Level student; we publish honest
              limitations alongside capabilities.
            </p>
          </section>

          <section data-chunk-id="citation">
            <h2 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">How to cite</h2>
            <p className="landing-lead font-mono text-sm">
              MarkScheme. (2026). Cambridge past paper marking methodology. markscheme.app/research
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="ec-btn-secondary min-h-[48px]">
              Press &amp; partnerships
            </Link>
            <Link href="/mark" className="ec-btn-primary min-h-[48px]">
              Try the product
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
