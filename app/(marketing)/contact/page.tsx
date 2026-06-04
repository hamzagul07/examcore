import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { ContactForm } from './contact-form'

export const metadata = getPageMetadata('/contact')

export default function ContactPage() {
  return (
    <>
      <PageJsonLd
        path="/contact"
        title="Contact MarkScheme"
        description="Contact MarkScheme for Cambridge past-paper marking support, feedback, and billing questions."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
      />
      <ContactForm />
    </>
  )
}
