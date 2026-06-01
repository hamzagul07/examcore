import Link from 'next/link'
import type { ReactNode } from 'react'

/** Shared chrome for /join/* — minimal header + centered content width. */
export function JoinPageChrome({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col justify-center py-4 sm:py-8">
      <header className="mb-8 text-center">
        <Link
          href="/"
          className="text-xl font-bold ec-text-gradient transition-opacity hover:opacity-90"
        >
          Examcore
        </Link>
      </header>
      {children}
    </div>
  )
}
