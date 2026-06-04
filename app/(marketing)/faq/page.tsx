import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { FAQ_CATEGORIES } from '@/lib/faq-data'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'FAQ — Cambridge past paper marking help',
  description:
    'Frequently asked questions about MarkScheme: handwritten uploads, mark scheme accuracy, free tier limits, pricing, privacy, and Cambridge A-Level / O-Level revision.',
  path: '/faq',
  keywords: ['Cambridge marking FAQ', 'AI marking A-Level', 'free past paper marking'],
})

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
        title={
          <span className="gradient-text">Questions you&apos;ll actually ask</span>
        }
        lead="Honest answers about marking, data, pricing, and getting started."
      />
      <MarketingSection className="!pt-0">
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
