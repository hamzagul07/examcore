import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { GUEST_BROWSE_COOKIE, isGuestBrowseEnabled } from '@/lib/guest-browse'
import { GuestSignupRedirect } from '@/components/auth/GuestSignupRedirect'

type Props = {
  children: ReactNode
}

function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot/i.test(
    userAgent
  )
}

/** Signed-in users and guest browsers (skip) see content; others redirect to signup. */
export async function GuestSignupGate({ children }: Props) {
  const h = await headers()
  if (isSearchEngineCrawler(h.get('user-agent'))) {
    return children
  }

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
