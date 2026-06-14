import type { NextRequest } from 'next/server'

/** Extract Bearer access token from Authorization header. */
export function readBearerAccessToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}
