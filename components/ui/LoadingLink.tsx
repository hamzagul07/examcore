'use client'

import Link from 'next/link'
import { useTransition, type ComponentProps, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import {
  ButtonLoadingState,
  CardLoadingPulse,
} from '@/components/ui/ButtonLoadingState'

type LoadingLinkProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  /** Replace label while navigation is pending (button variant only). */
  loadingText?: string
  /**
   * button — shimmer sweep + loadingText
   * card — keeps children, dims card and shows corner pulse
   * inline — keeps children, shimmer inline label
   */
  variant?: 'button' | 'card' | 'inline'
  children: ReactNode
}

export function LoadingLink({
  href,
  className,
  children,
  loadingText,
  variant = 'button',
  ...rest
}: LoadingLinkProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const hrefStr = typeof href === 'string' ? href : href.pathname ?? ''

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    e.preventDefault()
    if (variant === 'button') {
      triggerPrimaryHaptic()
    }
    startTransition(() => {
      router.push(hrefStr)
    })
  }

  if (variant === 'card') {
    return (
      <Link
        href={href}
        onClick={handleClick}
        aria-busy={pending || undefined}
        data-loading={pending ? 'true' : undefined}
        className={cn(
          'relative',
          className,
          pending && 'pointer-events-none opacity-75'
        )}
        {...rest}
      >
        {children}
        {pending ? <CardLoadingPulse /> : null}
      </Link>
    )
  }

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        onClick={handleClick}
        aria-busy={pending || undefined}
        data-loading={pending ? 'true' : undefined}
        className={cn(className, pending && 'pointer-events-none opacity-85')}
        {...rest}
      >
        {pending ? (
          <ButtonLoadingState mode="shimmer" loadingText={loadingText}>
            {children}
          </ButtonLoadingState>
        ) : (
          children
        )}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={pending || undefined}
      data-loading={pending ? 'true' : undefined}
      className={cn(
        className,
        pending && 'pointer-events-none ec-btn-loading-wrap',
        pending && 'ec-btn-shimmer'
      )}
      {...rest}
    >
      {pending ? (
        <ButtonLoadingState mode="shimmer" loadingText={loadingText}>
          {children}
        </ButtonLoadingState>
      ) : (
        children
      )}
    </Link>
  )
}
