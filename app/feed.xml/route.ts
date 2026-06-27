import { getBlogPosts } from '@/lib/blog'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { getAuthor } from '@/lib/seo/authors'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

export const dynamic = 'force-static'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET() {
  const posts = getBlogPosts()
  const base = SITE_URL.replace(/\/$/, '')

  const items = posts
    .map((p) => {
      const pub = p.updated || p.date
      const cluster = getClusterForSlug(p.slug)
      const category =
        cluster.id === 'ib'
          ? 'IB Diploma'
          : cluster.id === 'subject-guides'
            ? 'Subject guides'
            : 'Cambridge'
      const author = getAuthor(p.author)
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid isPermaLink="true">${base}/blog/${p.slug}</guid>
      <description>${escapeXml(p.description)}</description>
      <category>${escapeXml(category)}</category>
      <dc:creator>${escapeXml(author.name)}</dc:creator>
      ${pub ? `<pubDate>${new Date(pub).toUTCString()}</pubDate>` : ''}
    </item>`
    })
    .join('')

  const latest = posts.find((p) => p.updated || p.date)
  const lastBuild = latest ? new Date(latest.updated || latest.date).toUTCString() : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)} Blog</title>
    <link>${base}/blog</link>
    <description>Cambridge A-Level, O-Level and IB Diploma past paper tips, mark schemes, markbands, and revision guides.</description>
    <language>en-gb</language>
    ${lastBuild ? `<lastBuildDate>${lastBuild}</lastBuildDate>` : ''}
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
