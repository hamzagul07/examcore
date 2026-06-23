'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'
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
    <LoadingLink
      href={context.href}
      variant="inline"
      loadingText="Opening…"
      className={cn('ec-nav-context', className)}
    >
      {context.glyph ? (
        <span className="ec-nav-context-glyph" aria-hidden>
          {context.glyph}
        </span>
      ) : null}
      <span className="ec-nav-context-label">{context.label}</span>
    </LoadingLink>
  )
}
