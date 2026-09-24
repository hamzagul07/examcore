import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  CREATOR_REF_COOKIE,
  parseCreatorRef,
  validateCreatorCode,
  type CreatorRef,
} from '@/lib/creators/codes'
import { claimCreatorRef } from '@/lib/creators/service'

/**
 * A signed-in student claims a creator code: attribution is written once and
 * the gift marks are paid once. Takes the code from the body when the student
 * typed it, else from the attribution cookie the proxy set on their way in.
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ status: 'signin_required' }, pendingCookies, { status: 401 })
  }

  let body: { code?: unknown } = {}
  try {
    body = (await request.json()) as { code?: unknown }
  } catch {
    body = {}
  }

  const typed = validateCreatorCode(body.code)
  const ref: CreatorRef | null = typed.ok
    ? { kind: 'code', value: typed.code }
    : parseCreatorRef(request.cookies.get(CREATOR_REF_COOKIE)?.value)

  const result = await claimCreatorRef({ userId: user.id, ref })
  if (result.status === 'invalid') {
    return jsonWithAuthCookies({ status: 'invalid' }, pendingCookies, { status: 404 })
  }

  return jsonWithAuthCookies(
    {
      status: result.status,
      marksGranted: result.status === 'granted' ? result.marksGranted : 0,
      creator: {
        handle: result.creator.handle,
        displayName: result.creator.displayName,
        code: result.creator.code,
        giftMarks: result.creator.giftMarks,
      },
    },
    pendingCookies
  )
}
