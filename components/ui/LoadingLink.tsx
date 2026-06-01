'use client'

import Link from 'next/link'
import { useTransition, type ComponentProps, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'

type LoadingLinkProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  /** Replace label while navigation is pending (button variant only). */
  loadingText?: string
  /**
   * button — swaps children for spinner + loadingText
   * card — keeps children, dims card and shows corner spinner
   * inline — keeps children, shows small inline spinner
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
          className,
          pending && 'pointer-events-none opacity-70'
        )}
        {...rest}
      >
        {children}
        {pending && (
          <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--ec-brand)]" aria-hidden />
          </span>
        )}
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
        className={cn(className, pending && 'pointer-events-none opacity-80')}
        {...rest}
      >
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {loadingText ?? children}
          </span>
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
      className={cn(className, pending && 'pointer-events-none')}
      {...rest}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Link>
  )
}
