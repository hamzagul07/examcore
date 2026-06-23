'use client'

import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { HeaderCta } from '@/lib/site-header-config'
import { cn } from '@/lib/utils'

const CTA_CLASS: Record<'primary' | 'warm' | 'ghost', string> = {
  primary: 'ec-btn-primary ec-btn-primary--sm',
  warm: 'ec-btn-warm ec-btn-primary--sm',
  ghost: 'ec-btn-ghost ec-btn-ghost--sm',
}

function CtaLabel({ cta }: { cta: HeaderCta }) {
  if (!cta.shortLabel) return <>{cta.label}</>
  return (
    <>
      <span className="ec-cta-label ec-cta-label--full">{cta.label}</span>
      <span className="ec-cta-label ec-cta-label--short" aria-hidden>
        {cta.shortLabel}
      </span>
    </>
  )
}

function resolveDiscussHref(pathname: string, board: string | null, cta: HeaderCta): string {
  if (pathname.startsWith('/community/submit')) return cta.href
  if (board === 'cambridge' || board === 'ib') {
    return `/community/submit?board=${board}`
  }
  return cta.href
}

type Props = {
  cta: HeaderCta
  className?: string
  loadingText?: string
}

function DiscussSubmitLinkInner({ cta, className, loadingText = 'Opening…' }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const board = searchParams.get('board')
  const href = resolveDiscussHref(pathname, board, cta)

  return (
    <LoadingLink href={href} className={cn(CTA_CLASS[cta.style], className)} loadingText={loadingText}>
      <CtaLabel cta={cta} />
    </LoadingLink>
  )
}

function DiscussSubmitLinkFallback({ cta, className, loadingText = 'Opening…' }: Props) {
  return (
    <LoadingLink href={cta.href} className={cn(CTA_CLASS[cta.style], className)} loadingText={loadingText}>
      <CtaLabel cta={cta} />
    </LoadingLink>
  )
}

/** Exam Room header CTA — preserves active board tab in submit URL on /community. */
export function DiscussSubmitLink(props: Props) {
  return (
    <Suspense fallback={<DiscussSubmitLinkFallback {...props} />}>
      <DiscussSubmitLinkInner {...props} />
    </Suspense>
  )
}
