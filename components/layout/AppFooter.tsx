'use client'

import Link from 'next/link'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'

export function AppFooter() {
  const tabbed = useAuthenticatedAppChrome()

  return (
    <footer
      className={`mt-auto border-t ec-border-color px-4 py-5 sm:px-6 ${
        tabbed
          ? 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-5'
          : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs ec-text-secondary sm:flex-row sm:items-center sm:justify-between">
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
