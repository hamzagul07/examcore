import { NextRequest, NextResponse } from 'next/server'
import {
  REGION_COOKIE,
  REGION_COOKIE_MAX_AGE,
  isSupportedCurrency,
  regionFromCurrency,
  serializeRegion,
} from '@/lib/billing/region-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Persist a manual region/currency override in the ec_region cookie (1 year). */
export async function POST(req: NextRequest) {
  let body: { currency?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const currency = body.currency?.toLowerCase()
  if (!isSupportedCurrency(currency)) {
    return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
  }

  const choice = regionFromCurrency(currency)
  const res = NextResponse.json({ ok: true, currency: choice.currency, tier: choice.tier })
  res.cookies.set(REGION_COOKIE, serializeRegion(choice), {
    maxAge: REGION_COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
