import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  unsubscribeColumnPatch,
  verifyUnsubscribeToken,
} from '@/lib/community/email-unsubscribe'

/**
 * RFC 8058 one-click unsubscribe.
 *
 * Gmail and Yahoo require bulk senders to honour a List-Unsubscribe header, and
 * the provider proves it works by POSTing here — no redirect followed, no page
 * rendered, no session. A body link alone does not satisfy that, and mail that
 * fails the check gets filtered rather than bounced, so the failure is silent.
 *
 * The token is HMAC-signed and carries the user id, so this needs no auth: the
 * only thing it can do is switch off one email kind for the account the token
 * was minted for. GET hands humans to the real preferences page.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function tokenFromRequest(request: NextRequest): Promise<string | null> {
  const fromQuery = request.nextUrl.searchParams.get('token')
  if (fromQuery) return fromQuery

  // Providers send `List-Unsubscribe=One-Click` as a form body; some append the
  // token there instead of on the URL.
  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('form')) {
      const form = await request.formData()
      const value = form.get('token')
      return typeof value === 'string' && value ? value : null
    }
  } catch {
    // Body already consumed or malformed — the query param is the normal path.
  }
  return null
}

export async function POST(request: NextRequest) {
  const token = await tokenFromRequest(request)
  const parsed = token ? verifyUnsubscribeToken(token) : null

  // A provider retries on 5xx and may mark the sender as non-compliant, so an
  // unusable token is still a 200 — there is nothing for it to retry.
  if (!parsed) {
    return NextResponse.json({ ok: false, reason: 'invalid_token' }, { status: 200 })
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('user_profiles')
    .update({
      ...unsubscribeColumnPatch(parsed.kind),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.userId)

  if (error) {
    console.error('[email-unsubscribe] one-click update failed:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** Anyone who opens the header link by hand gets the page with the confirmation. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const target = new URL('/community/unsubscribe', request.nextUrl.origin)
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}
