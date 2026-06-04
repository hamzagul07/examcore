import Image from 'next/image'
import Link from 'next/link'

/** Zen (light) theme raster logo — transparent PNG. */
export const MARKSCHEME_LOGO_ZEN = '/brand/markscheme-zen.png'

/** Late Night (dark) theme raster logo — transparent PNG. */
export const MARKSCHEME_LOGO_LATE_NIGHT = '/brand/markscheme-late-night.png'

type WordmarkProps = {
  className?: string
  size?: 'sm' | 'md'
}

/** Display height; width follows each asset’s aspect ratio. */
const LOGO_HEIGHT = { sm: 28, md: 32 } as const
const LOGO_WIDTH = { sm: 140, md: 160 } as const

/** Shared MarkScheme wordmark — theme-specific transparent PNGs. */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const logoH = LOGO_HEIGHT[size]
  const logoW = LOGO_WIDTH[size]
  const heightClass = size === 'sm' ? 'h-7' : 'h-8'

  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={MARKSCHEME_LOGO_LATE_NIGHT}
        alt="Markscheme"
        width={logoW}
        height={logoH}
        className={`ec-wordmark-late-night w-auto shrink-0 object-contain object-left ${heightClass}`}
        priority
      />
      <Image
        src={MARKSCHEME_LOGO_ZEN}
        alt="Markscheme"
        width={logoW}
        height={logoH}
        className={`ec-wordmark-zen hidden w-auto shrink-0 object-contain object-left ${heightClass}`}
        priority
      />
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
