import { NextRequest, after } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import {
  DAILY_REPORT_CAP,
  countQualifyingReporters,
  shouldAutoHide,
  type ReporterProfile,
} from '@/lib/community/report-policy'
import { notifyContentHidden, type HiddenContentKind } from '@/lib/community/notify'

type TargetType = 'note' | 'question' | 'answer'

const TABLE: Record<TargetType, string> = {
  note: 'community_notes',
  question: 'community_questions',
  answer: 'community_answers',
}

/** Where the author lands from the "hidden pending review" notice. */
function targetHref(type: TargetType, id: string, questionId: string | null): string {
  if (type === 'note') return `/community/notes/${id}`
  if (type === 'question') return `/community/questions/${id}`
  return `/community/questions/${questionId ?? ''}`
}

/**
 * POST /api/community/report { targetType, targetId, reason } — file a report.
 *
 * Hiding is a three-reporter decision and only established accounts count
 * (see lib/community/report-policy.ts for the why). Each account may file
 * ten reports a day; a second report of the same target is idempotent.
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to report content.' }, pendingCookies, { status: 401 })
  }
  let body: { targetType?: string; targetId?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  const targetType = body.targetType
  if (targetType !== 'note' && targetType !== 'question' && targetType !== 'answer') {
    return jsonWithAuthCookies({ error: 'Invalid target.' }, pendingCookies, { status: 400 })
  }
  const targetId = body.targetId
  if (!targetId || typeof targetId !== 'string' || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return jsonWithAuthCookies({ error: 'Missing target.' }, pendingCookies, { status: 400 })
  }
  const reason = (body.reason || '').toString().trim().slice(0, 500)
  const admin = createServiceClient()

  // The target itself: its author is excluded from the reporter count and is
  // who gets told if it is hidden. Reporting something that does not exist
  // is a 404 rather than a silent insert, so the reports table does not fill
  // with rows pointing at nothing (published content is public anyway, so
  // the status code reveals nothing a page load would not).
  const { data: target } = await admin
    .from(TABLE[targetType])
    .select(targetType === 'answer' ? 'id, author_id, status, question_id' : 'id, author_id, status, title')
    .eq('id', targetId)
    .maybeSingle()
  if (!target) {
    return jsonWithAuthCookies({ error: 'That content no longer exists.' }, pendingCookies, { status: 404 })
  }
  const targetRow = target as {
    author_id: string | null
    status: string
    title?: string | null
    question_id?: string | null
  }

  // One report per user per target (idempotent); the unique index
  // uq_community_reports_reporter_target backs this up for direct inserts.
  const { data: dup } = await admin
    .from('community_reports')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('reporter_id', user.id)
    .maybeSingle()

  if (!dup) {
    // Per-account daily cap. A plain count over the reports table: it is one
    // indexed query and the cap only has to be roughly right, not atomic —
    // two racing reports at the boundary cost nothing.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: filedToday } = await admin
      .from('community_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .gte('created_at', since)
    if ((filedToday ?? 0) >= DAILY_REPORT_CAP) {
      return jsonWithAuthCookies(
        { error: `You have reported ${DAILY_REPORT_CAP} things today — please try again tomorrow.` },
        pendingCookies,
        { status: 429 }
      )
    }

    const { error: insertError } = await admin.from('community_reports').insert({
      target_type: targetType,
      target_id: targetId,
      reporter_id: user.id,
      reason,
    })
    // 23505 is the unique index catching a double-submit; treat as filed.
    if (insertError && insertError.code !== '23505') {
      console.error('[community/report] insert failed:', insertError)
      return jsonWithAuthCookies({ error: 'Could not file your report.' }, pendingCookies, { status: 500 })
    }
  }

  // Auto-hide once enough DISTINCT, established reporters have flagged it.
  if (targetRow.status === 'published') {
    const { data: openReports } = await admin
      .from('community_reports')
      .select('reporter_id')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('status', 'open')
    const reports = (openReports ?? []).map((r) => ({ reporterId: r.reporter_id as string | null }))
    const reporterIds = [...new Set(reports.map((r) => r.reporterId).filter((x): x is string => !!x))]

    const { data: profileRows } = reporterIds.length
      ? await admin.from('user_profiles').select('id, created_at, reputation').in('id', reporterIds)
      : { data: [] as { id: string; created_at: string | null; reputation: number | null }[] }
    const profiles = new Map<string, ReporterProfile>(
      (profileRows ?? []).map((p) => [
        p.id as string,
        { createdAt: (p.created_at as string | null) ?? null, reputation: (p.reputation as number | null) ?? null },
      ])
    )

    const qualifying = countQualifyingReporters(reports, profiles, { authorId: targetRow.author_id })
    if (shouldAutoHide(qualifying)) {
      // `.eq('status', 'published')` makes this a no-op if a concurrent
      // report already hid it, and the returned rows tell us whether THIS
      // request was the one that did — so the author is told exactly once.
      const { data: hidden } = await admin
        .from(TABLE[targetType])
        .update({ status: 'flagged' })
        .eq('id', targetId)
        .eq('status', 'published')
        .select('id')
      if (hidden?.length && targetRow.author_id) {
        const authorId = targetRow.author_id
        const kind: HiddenContentKind = targetType
        const href = targetHref(targetType, targetId, targetRow.question_id ?? null)
        const title = targetRow.title ?? null
        after(() => notifyContentHidden({ authorId, kind, targetId, href, title }))
      }
    }
  }

  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
