import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { GUEST_BROWSE_COOKIE, isGuestBrowseEnabled } from '@/lib/guest-browse'
import { GuestSignupRedirect } from '@/components/auth/GuestSignupRedirect'
import { GuestSavePrompt } from '@/components/auth/GuestSavePrompt'
import { CONTENT_GATE_BLOCKS } from '@/lib/billing/features'

type Props = {
  children: ReactNode
}

function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot/i.test(
    userAgent
  )
}

/** Everyone sees the content; signed-out readers also get a non-blocking save prompt. */
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

  // The content always renders now. This used to return the signup panel
  // INSTEAD of its children, so a reader arriving from search saw no lesson at
  // all — an account request before they had any reason to want one, on the
  // pages where most sessions land. The ask now waits until they have something
  // worth saving, and never covers what they are reading.
  if (!CONTENT_GATE_BLOCKS) {
    return (
      <>
        {children}
        <GuestSavePrompt />
      </>
    )
  }

  return <GuestSignupRedirect />
}
