'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'
import { SITE_NAME } from '@/lib/site-config'
import { cn } from '@/lib/utils'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

/** MarkScheme wordmark — Newsreader with ink-green dot (prototype). */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const textClass = size === 'sm' ? 'text-[21px]' : 'text-[23px]'

  return (
    <span className={`ec-wordmark inline-flex items-baseline ${textClass} ${className}`}>
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
