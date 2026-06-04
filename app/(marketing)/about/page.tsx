import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { AboutPersonJsonLd } from '@/components/seo/AboutPersonJsonLd'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/about')

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <AboutPersonJsonLd />
      <PageJsonLd
        path="/about"
        title="About MarkScheme"
        description="Built by an A-Level student: MarkScheme marks handwritten Cambridge past papers against real mark schemes."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />
      <MarketingHero
        label="ABOUT"
        title={
          <>
            <span className="gradient-text">Honest marking</span>{' '}
            <span className="ec-text-gradient">when you need it</span>
          </>
        }
        lead="Cambridge past-paper revision with real mark schemes — mark-by-mark feedback on your handwriting, not a generic AI grade."
      />

      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl space-y-12">
          <section>
            <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">The story</h2>
            <div className="landing-lead space-y-4">
              <p>
                MarkScheme was built by Hassan, an A-Level student who got tired of
                waiting weeks for marked papers and guessing what examiners
                actually wanted.
              </p>
              <p>
                Past-paper revision works — but marking your own work against a
                scheme is slow, and you miss things. Essay subjects are worse:
                you don&apos;t know if you&apos;re in Band 3 or Band 4 until
                someone qualified tells you.
              </p>
              <p>
                So he built the tool he wished existed: one that marks your work
                the way Cambridge does, with the same scheme and the same
                standards. Not a replacement for teachers. Just faster, honest
                feedback when you&apos;re revising alone at midnight.
              </p>
            </div>
          </section>

          <section>
            <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
              What makes MarkScheme different
            </h2>
            <ul className="landing-lead list-disc space-y-3 pl-5">
              <li>
                Built on <strong className="text-[var(--ec-text-primary)]">real Cambridge mark schemes</strong> — not a generic chatbot grade
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Adaptive marking</strong> — MCQ, point-based maths, and essay bands handled appropriately
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Examiner&apos;s Ink</strong> — feedback on your actual handwriting, not a wall of text
              </li>
              <li>No inflated stats, fake reviews, or &quot;revolutionizing education&quot; fluff</li>
            </ul>
          </section>

          <section>
            <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">Our values</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: 'Honest claims', body: 'We say what the product does and what it doesn\'t — including AI limitations.' },
                { title: 'Students first', body: 'Built for revision, priced for students, not tutor-agency money.' },
                { title: 'No fake proof', body: 'We don\'t invent user counts or testimonials. The free tier is real — try it on a past paper today.' },
              ].map((v) => (
                <div key={v.title} className="ec-card p-5">
                  <h3 className="mb-2 font-bold text-[var(--ec-text-primary)]">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{v.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="ec-card p-8 text-center sm:p-10">
            <h2 className="landing-h3 mb-3 text-[var(--ec-text-primary)]">
              Have feedback?
            </h2>
            <p className="landing-lead mb-6">
              We&apos;re still learning from real students. Tell us what works on
              your past papers and what we should improve.
            </p>
            <Link href="/contact" className="ec-btn-primary inline-flex min-h-[48px]">
              Get in touch <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
