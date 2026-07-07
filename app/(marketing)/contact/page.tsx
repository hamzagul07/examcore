import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { CONTACT_SEO_FAQ } from '@/lib/seo/contact-seo'
import { ContactGeoSection } from '@/components/seo/ContactGeoSection'
import { ContactForm } from './contact-form'

export const metadata = getPageMetadata('/contact')

export default function ContactPage() {
  return (
    <>
      <PageJsonLd
        path="/contact"
        title="Contact MarkScheme"
        description="Contact MarkScheme for Cambridge and IB marking support, school partnerships, press, and billing."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
      />
      <JsonLd
        data={faqPageNode(CONTACT_SEO_FAQ, {
          speakableSelectors: ['.contact-geo dt', '.contact-geo dd'],
        })}
      />
      <ContactForm geoSection={<ContactGeoSection />} />
    </>
  )
}
