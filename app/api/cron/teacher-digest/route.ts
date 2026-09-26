import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { runTeacherDigest } from '@/lib/teacher/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Constant-time compare, so the bearer secret cannot be guessed a byte at a time. */
function bearerMatches(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '', 'utf8')
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * The Sunday teacher digest — Vercel Cron, Sunday 16:00 UTC (vercel.json),
 * an hour before the students' weekly report. See lib/teacher/digest.ts.
 *
 * Dry run unless TEACHER_DIGEST_SEND=true: every digest is built (and the
 * week's sets reconciled) and a one-line summary per teacher is logged, but
 * nothing is sent and no teacher's send stamp moves. Off entirely with
 * TEACHER_V2=0.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    if (!bearerMatches(request.headers.get('authorization'), secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  if (!isTeacherV2()) {
    return NextResponse.json({ ok: true, skipped: 'teacher system switched off (TEACHER_V2=0)' })
  }

  try {
    const result = await runTeacherDigest()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/teacher-digest] run failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'Digest run failed' }, { status: 500 })
  }
}
