import { JsonLd } from '@/components/seo/JsonLd'
import {
  breadcrumbList,
  organizationNode,
  webPageNode,
  websiteNode,
} from '@/lib/seo/structured-data'

type Props = {
  path: string
  title: string
  description: string
  breadcrumbs?: { name: string; path: string }[]
}

/** Standard marketing page structured data. */
export function PageJsonLd({ path, title, description, breadcrumbs }: Props) {
  const crumbs = breadcrumbs ?? [{ name: 'Home', path: '/' }, { name: title, path }]
  return (
    <JsonLd
      data={[
        organizationNode(),
        websiteNode(),
        webPageNode({ path, name: title, description }),
        breadcrumbList(crumbs),
      ]}
    />
  )
}
