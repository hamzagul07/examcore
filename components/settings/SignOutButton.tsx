'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'

type Props = {
  className?: string
}

export function SignOutButton({ className }: Props) {
  const [pending, setPending] = useState(false)

  return (
    <form
      action="/auth/signout"
      method="POST"
      className="pt-4"
      onSubmit={() => setPending(true)}
    >
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        data-loading={pending ? 'true' : undefined}
        className={cn(
          'ec-btn-ghost w-full justify-center text-[var(--ec-text-secondary)]',
          pending && 'ec-btn-loading-wrap ec-btn-shimmer',
          className
        )}
      >
        {pending ? (
          <ButtonLoadingState mode="shimmer" loadingText="Signing out…">
            Sign out
          </ButtonLoadingState>
        ) : (
          'Sign out'
        )}
      </button>
    </form>
  )
}
