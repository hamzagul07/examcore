import { createOgImage } from '@/lib/seo/og-image'
import { getBlogPost } from '@/lib/blog'
import { getClusterForSlug } from '@/lib/seo/clusters'

export const runtime = 'nodejs'

type Props = { params: Promise<{ slug: string }> }

/** Per-post paper OG — file-convention blog/[slug]/opengraph-image 404s in this Next setup. */
export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  const cluster = getClusterForSlug(slug)
  return createOgImage({
    title: post?.title ?? 'MarkScheme',
    subtitle: cluster.title,
  })
}
