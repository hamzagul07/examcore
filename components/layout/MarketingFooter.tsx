import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/site-config'
import {
  SCULPTED_FOOTER_PRODUCT,
  SCULPTED_FOOTER_RESOURCES,
} from '@/lib/seo/internal-sculpt'

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
]

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--ec-border)]">
      <div className="landing-section !pb-12 !pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link href="/" className="text-xl font-bold ec-text-gradient">
              MarkScheme
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              Cambridge A-Level &amp; O-Level past papers — mark-by-mark feedback on
              your handwriting, tied to real mark schemes.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
              Built by an A-Level student for A-Level students
            </p>
          </div>

          <div>
            <h3 className="ec-label-tech mb-4">Product</h3>
            <ul className="space-y-2">
              {SCULPTED_FOOTER_PRODUCT.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="ec-label-tech mb-4">Company</h3>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="ec-label-tech mb-4">Resources</h3>
            <ul className="space-y-2">
              {SCULPTED_FOOTER_RESOURCES.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/compare"
                  className="inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
                >
                  Compare marking options
                </Link>
              </li>
            </ul>
            <Link
              href="/feed.xml"
              className="mt-2 inline-flex min-h-[44px] items-center text-xs text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
            >
              RSS feed
            </Link>
          </div>

          <div>
            <h3 className="ec-label-tech mb-4">Legal</h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--ec-border)] pt-8 text-xs text-[var(--ec-text-secondary)] sm:flex-row sm:items-start sm:justify-between">
          <span>© 2026 MarkScheme</span>
          <p className="max-w-xl leading-relaxed sm:text-right">
            Not affiliated with or endorsed by Cambridge International. Subject
            codes and syllabus references are Cambridge property used for
            educational purposes.
          </p>
        </div>
      </div>
    </footer>
  )
}
