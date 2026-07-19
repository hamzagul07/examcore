import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { getSyllabusByCode } from '@/lib/syllabi'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  type AttemptLite,
} from '@/lib/mastery'
import {
  topicTargetsFromMasteries,
  fetchTopicRecommendations,
} from '@/lib/insights/recommendations'
import type { NextDrill } from '@/lib/insights/types'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { effectiveAccess } from '@/lib/billing/access'
import { hasPaidAccess } from '@/lib/billing/features'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * The single top weak-topic "drill" for the signed-in user — powers the
 * "Drill your weakest spot" coach card. With `?subject=CODE` it ranks within one
 * subject (the post-mark card); with no subject it ranks GLOBALLY across every
 * subject the student has marked (the persistent dashboard entry). Premium-only,
 * and returns `{ drill: null }` whenever nothing resolves (free tier, no confirmed
 * weakness, or subjects with no stored questions — e.g. IB), so the client simply
 * renders nothing rather than a dead feature.
 */
export async function GET(request: NextRequest) {
  const subject = request.nextUrl.searchParams.get('subject')?.trim() || null

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ drill: null })

  // Premium gate (defense in depth — callers may also gate on isPaid).
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const paid = hasPaidAccess(
    effectiveAccess({
      tier: (subscription?.tier ?? 'free') as SubscriptionTier,
      status: (subscription?.status ?? 'canceled') as SubscriptionStatus,
      trialEndsAt: subscription?.trial_ends_at as string | null | undefined,
    })
  )
  if (!paid) return NextResponse.json({ drill: null })

  // A requested subject must have a syllabus tree; else nothing to rank.
  if (subject && !getSyllabusByCode(subject)?.length) {
    return NextResponse.json({ drill: null })
  }

  // Same read the progress dashboard uses: recent attempts scored into per-leaf
  // mastery. Service client — attempts RLS needs it.
  const { data: rawAttempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, syllabus_tags, created_at,
      time_spent_seconds, question_text, source_type, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const allAttempts = (rawAttempts || []) as unknown as AttemptWithPaper[]

  // Subjects to rank: the requested one, or every treed subject the student has
  // marked (for the global "your weakest spot" entry).
  const subjectCodes = subject
    ? [subject]
    : [
        ...new Set(
          allAttempts
            .map((a) => getAttemptSubjectCode(a))
            .filter((c): c is string => !!c)
        ),
      ].filter((c) => !!getSyllabusByCode(c)?.length)

  if (subjectCodes.length === 0) return NextResponse.json({ drill: null })

  // Per-subject weak-topic targets, tagged with subject + weakness %, then merged
  // weakest-first so the single drill we return is the student's biggest gap
  // across everything they've marked.
  const ranked = subjectCodes
    .flatMap((code) => {
      const subjectAttempts = allAttempts.filter(
        (a) => getAttemptSubjectCode(a) === code
      ) as AttemptLite[]
      const leaves = flattenLeafMasteries(
        calculateParentMastery(subjectAttempts, code)
      )
      const pctByCode = new Map(leaves.map((l) => [l.code, l.percentage]))
      return topicTargetsFromMasteries(leaves).map((target) => ({
        subjectCode: code,
        target,
        percentage: pctByCode.get(target.code) ?? 100,
      }))
    })
    .sort((a, b) => a.percentage - b.percentage)

  if (ranked.length === 0) return NextResponse.json({ drill: null })

  // Walk weakest-first, return the first that resolves to a real drill. IB topics
  // always resolve (the /mark practice flow generates a question); Cambridge needs
  // a stored past-paper question. Cap the walk so a run of misses stays bounded.
  for (const { subjectCode: code, target } of ranked.slice(0, 8)) {
    if (isIbSubjectCode(code)) {
      const drill: NextDrill = {
        kind: 'topic',
        subjectCode: code,
        topicCode: target.code,
        topicName: target.name,
        reason: target.reason,
      }
      return NextResponse.json({ drill })
    }
    const [rec] = await fetchTopicRecommendations(supabaseAdmin, [target], 1)
    if (rec) {
      const drill: NextDrill = { kind: 'paper', ...rec }
      return NextResponse.json({ drill })
    }
  }

  return NextResponse.json({ drill: null })
}
