import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { setPackDayCompleted } from '@/lib/max/sprint-day-completion'
import { loadEffectiveAccess } from '@/lib/billing/access'
import { hasMaxResourceVault } from '@/lib/billing/features'

/**
 * Toggle a Max Vault pack day complete/incomplete.
 * Body: { subjectCode, weekLabel, dayNumber, completed }
 */
export async function POST(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })
  }

  // Seat- and comp-aware (a comped Max user was refused here while the vault
  // page itself let them in — the two gates disagreed on what "Max" meant).
  const access = await loadEffectiveAccess(user.id)
  if (!hasMaxResourceVault(access)) {
    return jsonWithAuthCookies({ error: 'Max only' }, pendingCookies, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as {
    subjectCode?: unknown
    weekLabel?: unknown
    dayNumber?: unknown
    completed?: unknown
  }
  const subjectCode = typeof raw.subjectCode === 'string' ? raw.subjectCode.trim() : ''
  const weekLabel = typeof raw.weekLabel === 'string' ? raw.weekLabel.trim() : ''
  const dayNumber = typeof raw.dayNumber === 'number' ? raw.dayNumber : Number(raw.dayNumber)
  const completed = Boolean(raw.completed)

  if (!subjectCode || !weekLabel || !Number.isFinite(dayNumber)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const result = await setPackDayCompleted({
    supabase,
    userId: user.id,
    subjectCode,
    weekLabel,
    dayNumber,
    completed,
  })

  if (!result.ok) {
    return jsonWithAuthCookies(
      { error: result.error ?? 'Could not save' },
      pendingCookies,
      { status: 500 }
    )
  }

  return jsonWithAuthCookies({ ok: true, completed }, pendingCookies)
}
