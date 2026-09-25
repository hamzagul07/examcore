import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { loadMyClasses } from '@/lib/student/assignments'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * GET → `{classes: [{id, name, subject, teacher_display_name, joined_at, class_bonus}]}`
 * (docs/TEACHER_SYSTEM_SPEC.md §3).
 *
 * The caller's live classes (active membership, class not archived — RLS).
 * The teacher's name is read with the service client and leaves the server
 * only as a first name and initial; nothing about classmates is returned.
 * Not behind TEACHER_V2: seeing and leaving your classes is a privacy
 * control, and it predates v2.
 */
export async function GET(req: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Unauthorized' }, pendingCookies, { status: 401, headers: NO_STORE })
  }
  try {
    const classes = await loadMyClasses(supabase, createServiceClient(), user.id)
    return jsonWithAuthCookies({ classes }, pendingCookies, { headers: NO_STORE })
  } catch (err) {
    console.error('[api/classrooms/mine] load failed', err instanceof Error ? err.message : err)
    return jsonWithAuthCookies({ error: 'Could not load your classes. Try again.' }, pendingCookies, {
      status: 500,
      headers: NO_STORE,
    })
  }
}
