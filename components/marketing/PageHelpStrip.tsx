import Link from 'next/link'

type Props = {
  className?: string
}

/** Short help footer — FAQ, how-it-works, contact — for tools and deep pages. */
export function PageHelpStrip({ className = '' }: Props) {
  return (
    <aside
      className={`ec-page-help-strip ${className}`.trim()}
      aria-label="Need help?"
    >
      <p className="ec-page-help-strip__label">Need help?</p>
      <nav className="ec-page-help-strip__links" aria-label="Support links">
        <Link href="/mark">Mark a question</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </aside>
  )
}
