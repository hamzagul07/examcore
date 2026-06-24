'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import {
  ButtonLoadingState,
  CardLoadingPulse,
} from '@/components/ui/ButtonLoadingState'
import { scrollPageToTop } from '@/lib/navigation/scroll-page-to-top'

const MIN_LOADING_MS = 520

function normalizePath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] ?? path
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

type LoadingLinkProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  /** Fired when navigation starts (after click, before route transition). */
  onNavigate?: () => void
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
  onNavigate,
  ...rest
}: LoadingLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [showLoading, setShowLoading] = useState(false)
  const startedAtRef = useRef(0)

  const hrefStr = typeof href === 'string' ? href : href.pathname ?? ''

  useEffect(() => {
    if (pending) {
      setShowLoading(true)
      return
    }
    if (!showLoading) return
    const elapsed = Date.now() - startedAtRef.current
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed)
    const t = window.setTimeout(() => setShowLoading(false), remaining)
    return () => window.clearTimeout(t)
  }, [pending, showLoading])

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

    const targetPath = normalizePath(hrefStr)
    const currentPath = normalizePath(pathname)
    const hasHash = hrefStr.includes('#')

    if (!hasHash && targetPath === currentPath) {
      e.preventDefault()
      onNavigate?.()
      if (variant === 'button' || variant === 'inline') {
        triggerPrimaryHaptic()
      }
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    e.preventDefault()
    onNavigate?.()
    scrollPageToTop()
    startedAtRef.current = Date.now()
    setShowLoading(true)
    if (variant === 'button' || variant === 'inline') {
      triggerPrimaryHaptic()
    }
    startTransition(() => {
      router.push(hrefStr)
    })
  }

  const busy = showLoading

  if (variant === 'card') {
    return (
      <Link
        href={href}
        onClick={handleClick}
        aria-busy={busy || undefined}
        data-loading={busy ? 'true' : undefined}
        className={cn(
          'relative',
          className,
          busy && 'pointer-events-none opacity-75'
        )}
        {...rest}
      >
        {children}
        {busy ? <CardLoadingPulse /> : null}
      </Link>
    )
  }

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        onClick={handleClick}
        aria-busy={busy || undefined}
        data-loading={busy ? 'true' : undefined}
        className={cn(className, busy && 'pointer-events-none opacity-90')}
        {...rest}
      >
        {busy ? (
          <ButtonLoadingState mode="exam" loadingText={loadingText}>
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
      aria-busy={busy || undefined}
      data-loading={busy ? 'true' : undefined}
      className={cn(
        className,
        busy && 'pointer-events-none ec-btn-is-loading ec-btn-loading-wrap ec-btn-shimmer'
      )}
      {...rest}
    >
      {busy ? (
        <ButtonLoadingState mode="exam" loadingText={loadingText}>
          {children}
        </ButtonLoadingState>
      ) : (
        children
      )}
    </Link>
  )
}
