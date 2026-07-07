import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { FOR_TEACHERS_SEO_FAQ, TEACHER_FEATURES } from '@/lib/seo/for-teachers-seo'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/for-teachers')

export default function ForTeachersPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/for-teachers"
        title="MarkScheme for teachers & schools"
        description="Classrooms, blindspot analytics, and review queues on top of Cambridge & IB past-paper marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For teachers', path: '/for-teachers' },
        ]}
      />
      <JsonLd
        data={faqPageNode(FOR_TEACHERS_SEO_FAQ, {
          speakableSelectors: ['.for-teachers-faq dt', '.for-teachers-faq dd'],
        })}
      />
      <MarketingHero
        label="FOR TEACHERS & SCHOOLS"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'For teachers', path: '/for-teachers' },
        ]}
        title="Classroom analytics on real past-paper marking"
        lead="Students mark handwriting at /mark; you see class blindspots, grade risk, and can override AI marks when it matters."
      />
      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <aside className="ec-blog-quick-answer rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
            <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK ANSWER</p>
            <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
              <strong>MarkScheme</strong> (markscheme.app/for-teachers) lets Cambridge and IB teachers
              create classrooms with invite codes, view class-wide topic blindspots, and review student
              past-paper marking — built on the same {GEO_CATEGORY.secondPassMarking} engine students use
              at /mark.
            </p>
          </aside>

          <section>
            <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">What teachers get</h2>
            <ul className="space-y-4">
              {TEACHER_FEATURES.map((f) => (
                <li key={f.title} className="ec-card px-5 py-4 sm:px-6">
                  <h3 className="font-semibold text-[var(--ec-text-primary)]">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                    {f.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">Frequently asked</h2>
            <dl className="for-teachers-faq space-y-4">
              {FOR_TEACHERS_SEO_FAQ.map((item) => (
                <div key={item.q} className="ec-card px-5 py-4 sm:px-6">
                  <dt className="font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/teacher/dashboard" className="ec-btn-primary justify-center text-center">
              Open teacher dashboard
            </Link>
            <Link href="/contact" className="ec-btn-secondary justify-center text-center">
              Contact for schools
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
