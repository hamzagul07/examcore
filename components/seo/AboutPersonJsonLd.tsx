import { JsonLd } from '@/components/seo/JsonLd'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'
import { organizationNode, personNode } from '@/lib/seo/structured-data'

/** E-E-A-T Person + Organization on About. */
export function AboutPersonJsonLd() {
  return <JsonLd data={[organizationNode(), personNode(DEFAULT_BLOG_AUTHOR)]} />
}
