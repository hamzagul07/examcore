import { FAQ_CATEGORIES } from '@/lib/faq-data'
import { GEO_QA_PAIRS } from '@/lib/seo/llms-geo-qa'
import { faqPageNode } from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/JsonLd'

/** FAQPage structured data for rich results on /faq (includes GEO Q&A). */
export function FaqJsonLd() {
  const allItems = [...FAQ_CATEGORIES.flatMap((cat) => cat.items), ...GEO_QA_PAIRS]

  return (
    <JsonLd
      data={faqPageNode(allItems, {
        speakableSelectors: ['.faq-geo dt', '.faq-geo dd'],
      })}
    />
  )
}
