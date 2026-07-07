import Link from 'next/link'
import type { SVGProps } from 'react'
import { WordmarkLink } from '@/components/layout/Wordmark'
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_PRODUCT_LINKS,
  FOOTER_SOCIAL_LINKS,
  FOOTER_SUBJECT_LINKS,
  type SiteHeaderVariant,
} from '@/lib/site-nav'

type Props = { variant: Extract<SiteHeaderVariant, 'marketing' | 'reading'> }

// Inline brand SVGs (lucide dropped its brand icons).
function TwitterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" />
    </svg>
  )
}
function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}
function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.427.403a4.92 4.92 0 0 1 1.77 1.153 4.92 4.92 0 0 1 1.153 1.77c.163.457.349 1.257.403 2.427.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.427a4.92 4.92 0 0 1-1.153 1.77 4.92 4.92 0 0 1-1.77 1.153c-.457.163-1.257.349-2.427.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.427-.403a4.92 4.92 0 0 1-1.77-1.153 4.92 4.92 0 0 1-1.153-1.77c-.163-.457-.349-1.257-.403-2.427C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.427a4.92 4.92 0 0 1 1.153-1.77 4.92 4.92 0 0 1 1.77-1.153c.457-.163 1.257-.349 2.427-.403C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.775.132 4.905.333 4.14.63a6.865 6.865 0 0 0-2.485 1.613A6.865 6.865 0 0 0 .042 4.728C-.255 5.493-.456 6.363-.516 7.64-.574 8.92-.588 9.329-.588 12s.014 3.08.072 4.36c.06 1.277.261 2.147.558 2.912a6.865 6.865 0 0 0 1.613 2.485 6.865 6.865 0 0 0 2.485 1.613c.765.297 1.635.498 2.912.558 1.28.058 1.689.072 4.948.072s3.668-.014 4.948-.072c1.277-.06 2.147-.261 2.912-.558a6.865 6.865 0 0 0 2.485-1.613 6.865 6.865 0 0 0 1.613-2.485c.297-.765.498-1.635.558-2.912.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.06-1.277-.261-2.147-.558-2.912a6.865 6.865 0 0 0-1.613-2.485A6.865 6.865 0 0 0 19.86.63c-.765-.297-1.635-.498-2.912-.558C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}
function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.82a4.85 4.85 0 0 1-1-.13z" />
    </svg>
  )
}
const SOCIAL_ICON = {
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  tiktok: TiktokIcon,
}

function FooterSocials() {
  return (
    <div className="mt-4 flex items-center gap-3">
      {FOOTER_SOCIAL_LINKS.map((s) => {
        const Icon = SOCIAL_ICON[s.icon]
        return (
          <a
            key={s.href}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={s.label}
            className="text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
          >
            <Icon className="h-5 w-5" />
          </a>
        )
      })}
    </div>
  )
}

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
            <FooterSocials />
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
          <FooterSocials />
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
