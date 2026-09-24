import { NextRequest, NextResponse } from 'next/server'
import {
  CREATOR_REF_COOKIE,
  creatorRefCookieOptions,
  serializeCreatorRef,
  validateCreatorCode,
} from '@/lib/creators/codes'
import { resolveCreatorCodeForRun } from '@/lib/creators/service'

/**
 * A code typed by hand on the mark page never passes through a URL the proxy
 * can see, so the attribution cookie is set here instead. Without it a
 * follower who heard the code in a video — the exact person the spoken code
 * exists for — would mark with it and then sign up uncredited.
 */
export async function POST(request: NextRequest) {
  let body: { code?: unknown } = {}
  try {
    body = (await request.json()) as { code?: unknown }
  } catch {
    body = {}
  }
  const check = validateCreatorCode(body.code)
  if (!check.ok) return NextResponse.json({ ok: false }, { status: 400 })
  const code = await resolveCreatorCodeForRun(check.code)
  if (!code) return NextResponse.json({ ok: false }, { status: 404 })

  const res = NextResponse.json({ ok: true, code })
  res.cookies.set(
    CREATOR_REF_COOKIE,
    serializeCreatorRef({ kind: 'code', value: code }),
    creatorRefCookieOptions()
  )
  return res
}

/** "Remove" on the chip: forget the code for signup too. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CREATOR_REF_COOKIE, '', { ...creatorRefCookieOptions(), maxAge: 0 })
  return res
}
