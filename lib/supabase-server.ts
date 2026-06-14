import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

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

/** Authenticated Supabase client for route handlers (reads cookie store, not raw request cookies). */
export async function authenticateRouteRequest(request: NextRequest) {
  void request
  const cookieStore = await cookies()
  const pendingCookies: SupabaseAuthCookie[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored when called from a Server Component.
          }
        },
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user, pendingCookies }
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