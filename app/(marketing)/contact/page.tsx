import { createPageMetadata } from '@/lib/seo/metadata'
import { ContactForm } from './contact-form'

export const metadata = createPageMetadata({
  title: 'Contact MarkScheme — support & feedback',
  description:
    'Contact the MarkScheme team for Cambridge past-paper marking support, product feedback, billing questions, or partnership enquiries.',
  path: '/contact',
})

export default function ContactPage() {
  return <ContactForm />
}
