import Link from 'next/link'
import { WordmarkLink } from '@/components/layout/Wordmark'
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_PRODUCT_LINKS,
  FOOTER_SUBJECT_LINKS,
  type SiteHeaderVariant,
} from '@/lib/site-nav'

type Props = { variant: Extract<SiteHeaderVariant, 'marketing' | 'reading'> }

export function SiteFooter({ variant }: Props) {
  if (variant === 'reading') {
    return (
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link className="wordmark footer-wordmark" href="/courses">
              MarkScheme<i>.</i>
            </Link>
            <p className="body-2 footer-tagline">
              Past papers marked the way a real examiner marks — against the official Cambridge scheme.
            </p>
            <p className="micro footer-coming">CAMBRIDGE &amp; IB — PAST PAPERS, MARKING &amp; FREE COURSES</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            {FOOTER_PRODUCT_LINKS.filter((l) =>
              ['/mark', '/courses', '/ib', '/pricing'].includes(l.href)
            ).map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/dashboard/progress">Progress</Link>
          </div>
          <div className="footer-col">
            <h4>Subjects</h4>
            <Link href="/subjects/9702">9702 Physics</Link>
            <Link href="/subjects/9709">9709 Mathematics</Link>
            <Link href="/ib/subjects/tok">IB TOK</Link>
            <Link href="/ib/subjects/biology-hl">IB Biology HL</Link>
            <Link href="/subjects">Cambridge subjects</Link>
            <Link href="/ib/subjects">IB subjects</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            {FOOTER_COMPANY_LINKS.map((link) => (
              <Link key={link.href + link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-legal">
          <nav className="footer-legal-links" aria-label="Legal">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <span>© 2026 MarkScheme — built by a student, for students.</span>
          <span>Not endorsed by Cambridge International or the IB.</span>
        </div>
      </footer>
    )
  }

  return (
    <footer className="ec-ms-footer">
      <div className="ec-ms-footer__inner">
        <div>
          <WordmarkLink className="mb-3 inline-flex" />
          <p className="ec-ms-footer__lead">
            Past papers marked the way a real examiner marks — against the official Cambridge
            scheme.
          </p>
          <p className="ec-ms-footer__micro">CAMBRIDGE &amp; IB — PAST PAPERS, MARKING &amp; FREE COURSES</p>
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Product</h4>
          {FOOTER_PRODUCT_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Subjects</h4>
          {FOOTER_SUBJECT_LINKS.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Company</h4>
          {FOOTER_COMPANY_LINKS.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="ec-ms-footer__legal">
        <nav className="ec-ms-footer__legal-links" aria-label="Legal">
          {FOOTER_LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span>© 2026 MarkScheme — built by a student, for students.</span>
        <span>Not endorsed by Cambridge International or the IB.</span>
      </div>
    </footer>
  )
}
