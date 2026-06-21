'use client'

import Link from 'next/link'

export function MarginNotesFooter() {
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
          <Link href="/mark">Mark a question</Link>
          <Link href="/courses">Free courses</Link>
          <Link href="/ib">IB Diploma</Link>
          <Link href="/dashboard/progress">Progress</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="footer-col">
          <h4>Subjects</h4>
          <Link href="/courses/9702">9702 Physics</Link>
          <Link href="/courses/9709">9709 Mathematics</Link>
          <Link href="/courses/9701">9701 Chemistry</Link>
          <Link href="/courses">All subjects</Link>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <Link href="/about">The story</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/blog">Guides &amp; blog</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
      <div className="footer-legal">
        <nav className="footer-legal-links" aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refunds">Refunds</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
        <span>© 2026 MarkScheme — built by a student, for students.</span>
        <span>Not endorsed by Cambridge International or the IB.</span>
      </div>
    </footer>
  )
}
