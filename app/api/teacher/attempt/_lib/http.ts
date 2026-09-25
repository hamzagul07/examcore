import 'server-only'

import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'

/**
 * The route shape the review routes share (spec §3): signed in (401
 * `{error:'Unauthorized'}`) → teacher role (403 `{error:'Not a teacher'}`) →
 * the teacher's RLS client. Each handler then proves it may touch the script
 * (lib/teacher/reviews-query.ts resolveReviewScope → 404) before it creates
 * the service client.
 *
 * Underscore folder: private to the app router, never a route segment.
 */

export const NO_STORE = { 'Cache-Control': 'no-store' } as const

export function jsonError(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(field ? { error, field } : { error }, { status, headers: NO_STORE })
}

export function jsonOk(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

export type TeacherAuth = { supabase: SupabaseClient; user: User }

export async function authorizeTeacher(): Promise<TeacherAuth | { response: NextResponse }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { response: jsonError(401, 'Unauthorized') }
  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return { response: jsonError(403, 'Not a teacher') }
  return { supabase, user }
}

/** Decisions and notes are small; anything bigger did not come from the console. */
const MAX_BODY_BYTES = 64 * 1024

/** The JSON body (undefined when empty), or the 400/413 to answer with. */
export async function readJson(request: Request): Promise<{ body: unknown } | { response: NextResponse }> {
  let text: string
  try {
    text = await request.text()
  } catch {
    return { response: jsonError(400, 'Invalid JSON', 'body') }
  }
  if (text.length > MAX_BODY_BYTES) return { response: jsonError(413, 'That request is too large.') }
  if (!text.trim()) return { body: undefined }
  try {
    return { body: JSON.parse(text) as unknown }
  } catch {
    return { response: jsonError(400, 'Invalid JSON', 'body') }
  }
}

/** Postgres "new row violates row-level security policy". */
export function isRlsViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === '42501'
}

/** Postgres check_violation (a CHECK constraint refused the row). */
export function isCheckViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === '23514'
}

/** Log a failed step with its context and answer a 500 that leaks nothing. */
export function serverError(scope: string, context: Record<string, unknown>, err: unknown, message: string): NextResponse {
  console.error(`[teacher/${scope}] failed`, {
    ...context,
    error: err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err),
  })
  return jsonError(500, message)
}
