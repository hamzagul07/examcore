import Link from 'next/link'

export function AppFooter() {
  return (
    <footer
      className="mt-auto border-t px-4 py-5 sm:px-6"
      style={{ borderColor: 'var(--ec-border)' }}
    >
      <div
        className="mx-auto flex max-w-7xl flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between"
        style={{ color: 'var(--ec-text-secondary)' }}
      >
        <span>Examcore — © 2026</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/faq"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-[var(--ec-text-primary)]"
          >
            Help / FAQ
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-[var(--ec-text-primary)]"
          >
            Settings
          </Link>
          <Link
            href="/auth/signout"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-[var(--ec-text-primary)]"
          >
            Sign out
          </Link>
        </div>
      </div>
    </footer>
  )
}
