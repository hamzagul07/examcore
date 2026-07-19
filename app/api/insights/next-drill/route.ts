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
import { effectiveAccess } from '@/lib/billing/access'
import { hasPaidAccess } from '@/lib/billing/features'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * The single top weak-topic "drill" for the signed-in user in a subject —
 * powers the post-mark "Drill your weakest spot" coach card. Premium-only, and
 * returns `{ drill: null }` whenever nothing resolves (free tier, no syllabus
 * tree, no confirmed weakness, or a subject with no stored questions — e.g. IB),
 * so the client simply renders nothing rather than a dead feature.
 */
export async function GET(request: NextRequest) {
  const subject = request.nextUrl.searchParams.get('subject')?.trim()
  if (!subject) return NextResponse.json({ drill: null })

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ drill: null })

  // Premium gate (defense in depth — the client also gates on isPaid).
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

  // Mastery needs a syllabus tree for the subject; IB / untreed subjects opt out.
  if (!getSyllabusByCode(subject)?.length) {
    return NextResponse.json({ drill: null })
  }

  // Same read the progress dashboard uses: recent attempts, filtered to subject,
  // scored into per-leaf mastery. Service client — attempts RLS needs it.
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

  const attempts = ((rawAttempts || []) as unknown as AttemptWithPaper[]).filter(
    (a) => getAttemptSubjectCode(a) === subject
  ) as AttemptLite[]

  const masteries = flattenLeafMasteries(
    calculateParentMastery(attempts, subject)
  )
  const targets = topicTargetsFromMasteries(masteries)
  if (targets.length === 0) return NextResponse.json({ drill: null })

  // Top drill only — one clear next action, not a list.
  const [drill] = await fetchTopicRecommendations(supabaseAdmin, targets, 1)
  return NextResponse.json({ drill: drill ?? null })
}
