import Link from 'next/link'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'

/** Quick links to every topic hub — shown on blog index. */
export function TopicHubStrip() {
  return (
    <div className="ms-hub-strip">
      <p className="ms-overline" style={{ width: '100%', marginBottom: 4 }}>
        Topic hubs
      </p>
      {CONTENT_CLUSTERS.map((cluster) => (
        <Link key={cluster.id} href={cluster.path} className="ms-ob-chip">
          {cluster.headTerm}
        </Link>
      ))}
      <Link href="/guides" className="ec-btn-underline ms-hub-strip-more">
        All hubs →
      </Link>
    </div>
  )
}
