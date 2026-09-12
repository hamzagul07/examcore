import { NextRequest } from 'next/server'
import { getProfileById, getProfileByUsername } from '@/lib/community/profile'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/community/profile?user=<uuid> | ?username=<name>
 * Public community profile (safe fields only) — powers the mobile app's
 * tappable user profiles: reputation, join date, post count, top subjects.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const userId = sp.get('user')
  const username = sp.get('username')

  const profile = userId && UUID_RE.test(userId)
    ? await getProfileById(userId)
    : username
      ? await getProfileByUsername(username)
      : null

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })
  return Response.json({ profile })
}
