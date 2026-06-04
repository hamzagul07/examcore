import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { ContactForm } from './contact-form'

export const metadata = createPageMetadata({
  title: 'Contact MarkScheme — support & feedback',
  description:
    'Contact the MarkScheme team for Cambridge past-paper marking support, product feedback, billing questions, or partnership enquiries.',
  path: '/contact',
})

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
