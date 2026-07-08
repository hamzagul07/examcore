'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { setGuestBrowseCookie } from '@/lib/guest-browse'

type Props = {
  returnPath: string
  className?: string
}

/** Lets guests view gated topic content without creating an account (this session). */
export function GuestBrowseSkip({ returnPath, className }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={cn('ec-guest-browse-skip', className)}
      onClick={() => {
        setGuestBrowseCookie()
        router.push(returnPath)
      }}
    >
      Just browsing? Skip for now
    </button>
  )
}
