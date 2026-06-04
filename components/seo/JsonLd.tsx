import { jsonLdScript, type JsonLd } from '@/lib/seo/structured-data'

type Props = {
  data: JsonLd | JsonLd[]
}

export function JsonLd({ data }: Props) {
  const graph = Array.isArray(data) ? data : [data]
  const payload = {
    '@context': 'https://schema.org',
    ...(graph.length === 1 ? graph[0] : { '@graph': graph }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(payload) }}
    />
  )
}
