'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'
import { SITE_NAME } from '@/lib/site-config'
import { cn } from '@/lib/utils'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

/**
 * MarkScheme wordmark — Newsreader with ink-green period.
 * Dual ink is intentional: green period = awarded marks; crimson logo tick
 * (--ec-logo-crimson) = examiner correction. Do not unify to one colour.
 */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const textClass = size === 'sm' ? 'text-[21px]' : 'text-[23px]'

  return (
    <span
      className={`ec-wordmark inline-flex items-baseline ${textClass} ${className}`}
      title="Green = awarded · Crimson = examiner correction"
    >
      MarkScheme
      <i className="ec-wordmark-dot" aria-hidden>
        .
      </i>
      <span className="sr-only">{SITE_NAME}</span>
    </span>
  )
}

export function WordmarkLink({
  href = '/',
  size = 'md',
  className,
}: {
  href?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <LoadingLink
      href={href}
      // The wordmark renders in the header AND footer of every page and points
      // at the landing (or the dashboard when signed in) — both chunk-heavy
      // routes. Its viewport prefetch was the last big source of the mid-scroll
      // eval storm: ~700KB of JS plus the full prefetched RSC payload of a
      // static route, decoded as a 2s+ main-thread task. A "go home" affordance
      // is clicked rarely; it does not need to be pre-warmed on every page.
      prefetch={false}
      variant="inline"
      loadingText="Home"
      className={cn(
        'ec-wordmark-link inline-flex shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ec-brand)]',
        className
      )}
    >
      <Wordmark size={size} />
    </LoadingLink>
  )
}
