import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { FAQ_CATEGORIES } from '@/lib/faq-data'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'FAQ',
  description:
    'Answers about Cambridge A-Level marking, handwriting uploads, pricing, privacy, and getting started with Examcore.',
  path: '/faq',
})

export default function FaqPage() {
  return (
    <MarketingPageShell>
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
