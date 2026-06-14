import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  return jsonWithAuthCookies(
    { user: user ? { id: user.id } : null },
    pendingCookies
  )
}
