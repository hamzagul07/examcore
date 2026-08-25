import type { ReactNode } from 'react'
import { GuestSavePrompt } from '@/components/auth/GuestSavePrompt'

type Props = {
  children: ReactNode
}

/**
 * Everyone sees the content; signed-out readers also get a non-blocking save
 * prompt.
 *
 * This used to read `headers()`, `cookies()` and the Supabase session to
 * decide — server-side — whether to append the prompt. That one read made
 * every route that wraps content in this gate dynamic: ~1,700 CAIE lessons,
 * the IB lessons and both past-paper topic surfaces re-rendered on every
 * request and never hit the CDN, even though all of them have
 * `generateStaticParams` and the content is identical for every visitor.
 *
 * The decision the gate was making is a client-side decision: whether the
 * *prompt* shows. So the prompt now decides for itself (signed-in, guest-browse
 * cookie, crawler UA — see GuestSavePrompt), the gate renders the same HTML for
 * everyone, and the pages prerender.
 *
 * If a blocking content gate ever returns (see CONTENT_GATE_BLOCKS history in
 * lib/billing/features.ts), it must NOT come back as a server-side read here —
 * that re-forfeits static rendering for the whole library. Gate in middleware
 * or client-side instead.
 */
export function GuestSignupGate({ children }: Props) {
  return (
    <>
      {children}
      <GuestSavePrompt />
    </>
  )
}
