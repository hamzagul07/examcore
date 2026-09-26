import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { runAssignmentReminders } from '@/lib/teacher/reminders'

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
 * "Due in the next 24 hours and still missing" — Vercel Cron, daily at 16:00
 * UTC (vercel.json). See lib/teacher/reminders.ts for who is reminded.
 *
 * In-app reminders always go out (and stamp reminded_at); the email is a dry
 * run — logged, not sent — unless ASSIGNMENT_REMINDER_SEND=true. Off entirely
 * with TEACHER_V2=0.
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
    const result = await runAssignmentReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/assignment-reminders] run failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'Reminder run failed' }, { status: 500 })
  }
}
