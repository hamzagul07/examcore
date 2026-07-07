import { LANDING_PAGE_FAQ } from '@/lib/seo/landing-faq'
import { DEFAULT_SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  faqPageNode,
  organizationNode,
  softwareApplicationNode,
  webPageNode,
  websiteNode,
} from '@/lib/seo/structured-data'

/** Homepage — Organization, WebSite, WebPage, FAQ, SoftwareApplication. */
export function HomeJsonLd() {
  return (
    <JsonLd
      data={[
        organizationNode(),
        websiteNode(),
        webPageNode({
          path: '/',
          name: `${SITE_NAME} — ${SITE_TAGLINE}`,
          description: DEFAULT_SITE_DESCRIPTION,
        }),
        softwareApplicationNode(),
        faqPageNode(LANDING_PAGE_FAQ, {
          speakableSelectors: ['.landing-faq .ms-faq-q span:first-child', '.landing-faq .ms-body-2'],
        }),
      ]}
    />
  )
}
