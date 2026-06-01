import { createPageMetadata } from '@/lib/seo/metadata'
import { ContactForm } from './contact-form'

export const metadata = createPageMetadata({
  title: 'Contact',
  description:
    'Get in touch with the Examcore team — feedback, questions, and support.',
  path: '/contact',
})

export default function ContactPage() {
  return <ContactForm />
}
