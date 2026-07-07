import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { FAQ_CATEGORIES } from '@/lib/faq-data'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import { FaqGeoSection } from '@/components/seo/FaqGeoSection'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/faq')

export default function FaqPage() {
  return (
    <MarketingPageShell>
      <FaqJsonLd />
      <PageJsonLd
        path="/faq"
        title="FAQ — Cambridge past paper marking"
        description="Frequently asked questions about MarkScheme, handwritten uploads, mark schemes, pricing, and privacy."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
      />
      <MarketingHero
        label="FAQ"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
        title="Questions you'll actually ask"
        lead="Honest answers about Cambridge & IB marking, data, pricing, and getting started."
      />
      <MarketingSection className="!pt-0">
        <FaqGeoSection />
        <FaqAccordion categories={FAQ_CATEGORIES} />
        <p className="landing-lead mt-12 text-center">
          Still stuck?{' '}
          <Link href="/contact" className="ec-link">
            Get in touch
          </Link>
          .
        </p>
      </MarketingSection>
    </MarketingPageShell>
  )
}
