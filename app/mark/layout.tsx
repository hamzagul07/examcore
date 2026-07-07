import type { ReactNode } from 'react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { MarkSeoIntro } from '@/components/seo/MarkSeoIntro'
import { faqPageNode } from '@/lib/seo/structured-data'
import { MARK_SEO_FAQ } from '@/lib/seo/mark-seo'
import { markingHowToJsonLd } from '@/lib/seo/marking-how-to'

export const metadata = getPageMetadata('/mark')

export default function MarkLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageJsonLd
        path="/mark"
        title="Mark Cambridge & IB past papers"
        description="Free past-paper marking for Cambridge International and IB Diploma: upload handwritten answers and get mark-by-mark feedback from real mark schemes and markbands."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Mark a paper', path: '/mark' },
        ]}
      />
      <JsonLd
        data={[
          faqPageNode(MARK_SEO_FAQ, {
            speakableSelectors: ['.mark-seo-faq'],
          }),
          markingHowToJsonLd(),
        ]}
      />
      <MarkSeoIntro />
      {children}
    </>
  )
}
