import Link from 'next/link'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'

/** Quick links to every topic hub — shown on blog index. */
export function TopicHubStrip() {
  return (
    <div className="ms-hub-strip ms-hub-strip--desk">
      <p className="ms-overline">Topic hubs</p>
      {CONTENT_CLUSTERS.map((cluster) => (
        <Link key={cluster.id} href={cluster.path} className="ms-ob-chip">
          {cluster.headTerm}
        </Link>
      ))}
      <Link href="/guides" className="ec-btn-underline ms-hub-strip-more">
        All hubs -&gt;
      </Link>
    </div>
  )
}
