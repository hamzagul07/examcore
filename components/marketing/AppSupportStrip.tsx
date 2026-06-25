import Link from 'next/link'

type Props = {
  className?: string
}

/** Compact help row for signed-in app surfaces (dashboard, progress, account). */
export function AppSupportStrip({ className = '' }: Props) {
  return (
    <aside
      className={`ec-page-help-strip ec-app-support-strip ${className}`.trim()}
      aria-label="Need help?"
    >
      <p className="ec-page-help-strip__label">Need help?</p>
      <nav className="ec-page-help-strip__links" aria-label="Support links">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/account">Account settings</Link>
      </nav>
    </aside>
  )
}
