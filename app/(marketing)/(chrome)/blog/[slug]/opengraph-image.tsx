import { createOgImage } from '@/lib/seo/og-image'
import { getAllBlogSlugs, getBlogPost } from '@/lib/blog'
import { getClusterForSlug } from '@/lib/seo/clusters'

export const alt = 'MarkScheme — Cambridge past paper guides'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  const cluster = getClusterForSlug(slug)
  return createOgImage({
    title: post?.title ?? 'MarkScheme',
    subtitle: cluster.title,
  })
}
