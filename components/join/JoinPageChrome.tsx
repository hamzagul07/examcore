import type { ReactNode } from 'react'
import { WordmarkLink } from '@/components/layout/Wordmark'

/** Shared chrome for /join/* — minimal header + centered content width. */
export function JoinPageChrome({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col justify-center py-4 sm:py-8">
      <header className="mb-8 flex justify-center">
        <WordmarkLink />
      </header>
      {children}
    </div>
  )
}
