import Link from 'next/link'
import type { HeaderContext } from '@/lib/site-header-config'
import { cn } from '@/lib/utils'

export function SiteHeaderContext({
  context,
  className,
}: {
  context: HeaderContext
  className?: string
}) {
  return (
    <Link href={context.href} className={cn('ec-nav-context', className)}>
      {context.glyph ? (
        <span className="ec-nav-context-glyph" aria-hidden>
          {context.glyph}
        </span>
      ) : null}
      <span className="ec-nav-context-label">{context.label}</span>
    </Link>
  )
}
