import Link from 'next/link'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

/** Shared Examcore wordmark with optional icon mark. */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const iconSize = size === 'sm' ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`ec-chat-avatar flex shrink-0 items-center justify-center rounded-lg font-extrabold ec-on-brand-text shadow-[var(--ec-btn-glow)] ${iconSize}`}
        aria-hidden
      >
        E
      </span>
      <span className={`font-bold tracking-tight ec-text-gradient ${textSize} max-[420px]:hidden`}>
        Examcore
      </span>
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
    <Link href={href} className="inline-flex shrink-0">
      <Wordmark size={size} />
    </Link>
  )
}
