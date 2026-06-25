import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  className?: string
}

/** Consistent back navigation on deep marketing and app pages. */
export function PageBackLink({ href, children, className = '' }: Props) {
  return (
    <Link
      href={href}
      className={`ec-page-back inline-flex min-h-[44px] max-w-full items-center gap-1 text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)] ${className}`.trim()}
    >
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  )
}
