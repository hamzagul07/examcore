import { getClusterForSlug } from '@/lib/seo/clusters'

export type BreadcrumbItem = { name: string; path: string }

/** Breadcrumb trail for blog posts — cluster hub for IB (≤4 clicks from home). */
export function blogBreadcrumbs(slug: string, title: string): BreadcrumbItem[] {
  const cluster = getClusterForSlug(slug)
  const postPath = `/blog/${slug}`

  if (cluster.id === 'ib') {
    return [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: cluster.title, path: cluster.path },
      { name: title, path: postPath },
    ]
  }

  if (cluster.id === 'subject-guides' || cluster.id === 'grade-boundaries' || cluster.id === 'command-words') {
    return [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: cluster.title, path: cluster.path },
      { name: title, path: postPath },
    ]
  }

  return [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: title, path: postPath },
  ]
}
