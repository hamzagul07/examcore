import Link from 'next/link'
import { CONTACT_SEO_FAQ } from '@/lib/seo/contact-seo'

/** Server-rendered contact GEO block for crawlers. */
export function ContactGeoSection() {
  return (
    <section className="mb-8" aria-labelledby="contact-geo-heading">
      <h2 id="contact-geo-heading" className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
        Schools, press &amp; support
      </h2>
      <dl className="contact-geo ms-tool-faq">
        {CONTACT_SEO_FAQ.map((item) => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="landing-lead mt-6 text-[var(--ec-text-secondary)]">
        Teachers:{' '}
        <Link href="/for-teachers" className="ec-link">
          /for-teachers
        </Link>
        . Press:{' '}
        <Link href="/research" className="ec-link">
          /research
        </Link>
        .
      </p>
    </section>
  )
}
