import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Design previews, not product.
 *
 * Twenty-four pages under /dev were reachable in production and crawlable by
 * default: the prefix is absent from PROTECTED_ROUTE_PREFIXES in lib/auth-gates
 * AND from PRIVATE_PREFIXES in app/robots.ts, and robots rules are allow/disallow
 * lists — a path named in neither is simply allowed. They render unfinished
 * component states under the real brand, and several duplicate product copy,
 * which is thin-content risk on a domain still inside Google's trust window.
 *
 * Kept for local work, 404 everywhere else. ENABLE_DEV_PAGES=true reopens them
 * on a preview deployment when a design review genuinely needs a shared URL.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_DEV_PAGES !== 'true'
  ) {
    notFound()
  }
  return <>{children}</>
}
