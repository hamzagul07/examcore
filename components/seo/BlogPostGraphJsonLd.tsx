import type { BlogPost } from '@/lib/blog'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildBlogPostGraph } from '@/lib/seo/graph'

type Props = {
  post: BlogPost
  content: string
}

/** Interconnected @graph for blog posts (Article ↔ WebPage ↔ Person ↔ FAQ/HowTo). */
export function BlogPostGraphJsonLd({ post, content }: Props) {
  return <JsonLd data={buildBlogPostGraph(post, content)} />
}
