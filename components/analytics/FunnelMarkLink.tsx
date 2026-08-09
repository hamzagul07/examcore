'use client'

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

type Props = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  children: ReactNode
  /** Funnel source label, e.g. board_hub_edexcel */
  source: string
  board?: string | null
  subject?: string | null
}

/** Mark CTA that dual-writes mark_cta_clicked before navigation. */
export function FunnelMarkLink({
  source,
  board,
  subject,
  children,
  ...linkProps
}: Props) {
  return (
    <Link
      {...linkProps}
      onClick={() =>
        trackFunnelEvent('mark_cta_clicked', {
          source,
          board: board ?? null,
          subject: subject ?? null,
        })
      }
    >
      {children}
    </Link>
  )
}
