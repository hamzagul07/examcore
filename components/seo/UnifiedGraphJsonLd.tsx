import { JsonLd } from '@/components/seo/JsonLd'
import { buildSiteGraph } from '@/lib/seo/graph-site'

/** Site-wide nested @graph with cross-referenced @id nodes. */
export function UnifiedGraphJsonLd() {
  return <JsonLd data={buildSiteGraph()} />
}
