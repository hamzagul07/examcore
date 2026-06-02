import { FAQ_CATEGORIES } from '@/lib/faq-data'

/** FAQPage structured data for rich results on /faq. */
export function FaqJsonLd() {
  const mainEntity = FAQ_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({
      '@type': 'Question' as const,
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.a,
      },
    }))
  )

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
