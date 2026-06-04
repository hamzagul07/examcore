import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'
import { MarkSchemeLogoMark } from '@/components/layout/MarkSchemeLogoMark'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

/** Handwritten MarkScheme wordmark — theme tokens, no raster assets. */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const iconClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const textClass = size === 'sm' ? 'text-[1.35rem]' : 'text-[1.55rem]'

  return (
    <span className={`ec-wordmark inline-flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <MarkSchemeLogoMark className={`${iconClass} shrink-0 drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--ec-brand)_30%,transparent)]`} />
      <span className={`ec-wordmark-text max-[420px]:hidden ${textClass}`}>
        <span className="ec-wordmark-name">
          <span className="ec-text-gradient">Mark</span>
          <span className="ec-wordmark-scheme">Scheme</span>
        </span>
        <svg
          className="ec-wordmark-underline"
          viewBox="0 0 120 8"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M2 5.5c18-3 38 4 58 1.5s42-5 58-2"
            stroke="var(--ec-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </svg>
      </span>
      <span className="sr-only">{SITE_NAME}</span>
    </span>
  )
}

export function WordmarkLink({
  href = '/',
  size = 'md',
}: {
  href?: string
  size?: 'sm' | 'md'
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ec-brand)]">
      <Wordmark size={size} />
    </Link>
  )
}
