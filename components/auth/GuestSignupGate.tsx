import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { GUEST_BROWSE_COOKIE, isGuestBrowseEnabled } from '@/lib/guest-browse'
import { GuestSignupRedirect } from '@/components/auth/GuestSignupRedirect'

type Props = {
  children: ReactNode
}

/** Signed-in users and guest browsers (skip) see content; others redirect to signup. */
export async function GuestSignupGate({ children }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return children
  }

  const cookieStore = await cookies()
  if (isGuestBrowseEnabled(cookieStore.get(GUEST_BROWSE_COOKIE)?.value)) {
    return children
  }

  return <GuestSignupRedirect />
}
