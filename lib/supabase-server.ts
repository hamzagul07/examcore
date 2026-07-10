import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { readBearerAccessToken } from '@/lib/auth-bearer'

type ResponseCookie = Parameters<NextResponse['cookies']['set']>[2]

export type SupabaseAuthCookie = {
  name: string
  value: string
  options?: ResponseCookie
}

/** Collect auth cookies while talking to Supabase in a route handler. */
export function createClientFromRequest(
  request: NextRequest,
  onCookies?: (cookiesToSet: SupabaseAuthCookie[]) => void
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          onCookies?.(cookiesToSet)
        },
      },
    }
  )
}

export function applyAuthCookies(
  response: NextResponse,
  cookiesToSet: SupabaseAuthCookie[]
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}

export function redirectWithAuthCookies(
  url: URL | string,
  cookiesToSet: SupabaseAuthCookie[]
) {
  return applyAuthCookies(NextResponse.redirect(url), cookiesToSet)
}

function createCookieAuthClient(
  request: NextRequest,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  onCookies: (cookiesToSet: SupabaseAuthCookie[]) => void
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const merged = new Map<string, { name: string; value: string }>()
          for (const cookie of cookieStore.getAll()) {
            merged.set(cookie.name, cookie)
          }
          for (const cookie of request.cookies.getAll()) {
            merged.set(cookie.name, cookie)
          }
          return Array.from(merged.values())
        },
        setAll(cookiesToSet) {
          onCookies(cookiesToSet)
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route handlers cannot always mutate the cookie store.
          }
        },
      },
    }
  )
}

/** Supabase client scoped to a verified access token (PostgREST RLS). */
export function createUserClientWithAccessToken(
  accessToken: string
): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

/** Authenticated Supabase client for route handlers. */
export async function authenticateRouteRequest(request: NextRequest) {
  const pendingCookies: SupabaseAuthCookie[] = []
  const cookieStore = await cookies()
  const cookieSupabase = createCookieAuthClient(request, cookieStore, (cookiesToSet) => {
    pendingCookies.push(...cookiesToSet)
  })

  const {
    data: { user: cookieUser },
  } = await cookieSupabase.auth.getUser()

  if (cookieUser) {
    return { supabase: cookieSupabase, user: cookieUser, pendingCookies }
  }

  const accessToken = readBearerAccessToken(request)
  if (accessToken) {
    const {
      data: { user: tokenUser },
    } = await cookieSupabase.auth.getUser(accessToken)

    if (tokenUser) {
      return {
        supabase: createUserClientWithAccessToken(accessToken),
        user: tokenUser,
        pendingCookies,
      }
    }
  }

  return { supabase: cookieSupabase, user: null, pendingCookies }
}

/**
 * Guardrail for routes that persist user-scoped data from a request body.
 * If the request carried Supabase auth cookies but the user resolved to null,
 * the row is about to be saved anonymously (user_id = null) despite a
 * logged-in caller — the exact silent-data-loss bug that orphaned ~6 weeks of
 * marked attempts on the streaming-multipart mark routes. Log it loudly so any
 * regression surfaces immediately instead of failing silently. Returns true
 * when the anomaly is detected. A genuinely anonymous request (no auth cookie)
 * is expected and logs nothing.
 */
export function warnIfAuthDropped(
  request: NextRequest,
  userId: string | null,
  context: string
): boolean {
  if (userId) return false
  const hadAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes('auth-token'))
  if (hadAuthCookie) {
    console.error(
      `[auth-dropped] ${context}: request carried Supabase auth cookies but ` +
        `user resolved to null — data will save with user_id=null. Likely a ` +
        `streaming-multipart auth regression (use authenticateRouteRequest).`
    )
    return true
  }
  return false
}

export function jsonWithAuthCookies<T>(
  body: T,
  pendingCookies: SupabaseAuthCookie[],
  init?: ResponseInit
) {
  return applyAuthCookies(NextResponse.json(body, init), pendingCookies)
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is missing')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}