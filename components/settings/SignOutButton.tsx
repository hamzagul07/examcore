'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          className
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Signing out...
          </>
        ) : (
          'Sign out'
        )}
      </button>
    </form>
  )
}
