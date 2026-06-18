import Link from 'next/link'
import { WordmarkLink } from '@/components/layout/Wordmark'

const PRODUCT_LINKS = [
  { href: '/mark', label: 'Mark a question' },
  { href: '/courses', label: 'Free courses' },
  { href: '/tools/grade-boundary-calculator', label: 'Grade calculator' },
  { href: '/tools/command-words', label: 'Command words' },
  { href: '/pricing', label: 'Pricing' },
]

const SUBJECT_LINKS = [
  { href: '/subjects/9709', label: '9709 Mathematics' },
  { href: '/subjects/9702', label: '9702 Physics' },
  { href: '/subjects/9701', label: '9701 Chemistry' },
  { href: '/subjects', label: 'All 15 subjects' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'The story' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/guides', label: 'Guides & blog' },
  { href: '/how-it-works#honest', label: 'Honest about AI' },
  { href: '/contact', label: 'Contact' },
]

export function MarketingFooter() {
  return (
    <footer className="ec-ms-footer">
      <div className="ec-ms-footer__inner">
        <div>
          <WordmarkLink className="mb-3 inline-flex" />
          <p className="ec-ms-footer__lead">
            Past papers marked the way a real examiner marks — against the official Cambridge
            scheme.
          </p>
          <p className="ec-ms-footer__micro">IB &amp; MORE BOARDS — COMING LATER</p>
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Product</h4>
          {PRODUCT_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Subjects</h4>
          {SUBJECT_LINKS.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ec-ms-footer__col">
          <h4 className="ec-ms-footer__label">Company</h4>
          {COMPANY_LINKS.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="ec-ms-footer__legal">
        <span>© 2026 MarkScheme — built by a student, for students.</span>
        <span>Not endorsed by Cambridge International.</span>
      </div>
    </footer>
  )
}
