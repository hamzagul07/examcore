/**
 * Persist Max exam packs per user / subject / ISO week so Vault opens stay cheap.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMaxExamPack,
  type MaxExamPack,
} from '@/lib/max/build-exam-pack'
import type { LeafMastery } from '@/lib/mastery'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { MAX_SPRINT_WINDOW_DAYS } from '@/lib/billing/features'

function isoWeekLabel(d = new Date()): string {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  return start.toISOString().slice(0, 10)
}

function isSprintNow(examDate?: string | null): boolean {
  const countdown = examCountdown(examDate)
  return countdown.kind === 'future' && countdown.daysLeft <= MAX_SPRINT_WINDOW_DAYS
}

function isMaxExamPack(value: unknown): value is MaxExamPack {
  if (!value || typeof value !== 'object') return false
  const p = value as MaxExamPack
  return (
    typeof p.subjectCode === 'string' &&
    typeof p.weekLabel === 'string' &&
    Array.isArray(p.days) &&
    typeof p.isSprint === 'boolean'
  )
}

/** Backfill completionKey for packs cached before the field existed. */
function withCompletionKey(pack: MaxExamPack, examDate?: string | null): MaxExamPack {
  if (pack.completionKey) return pack
  const examKey = examDate?.trim().slice(0, 10) || null
  return {
    ...pack,
    completionKey: pack.isSprint
      ? `sprint:${examKey ?? 'open'}`
      : pack.weekLabel,
  }
}

/**
 * Load a cached pack for this ISO week, or build + upsert one.
 * Cache miss / invalid row / write failure all fall through to a fresh build.
 */
export async function getCachedMaxExamPack(opts: {
  supabase: SupabaseClient
  userId: string
  subjectCode: string
  masteries: LeafMastery[]
  examDate?: string | null
}): Promise<MaxExamPack> {
  const weekLabel = isoWeekLabel()
  const sprint = isSprintNow(opts.examDate)

  const { data: cached } = await opts.supabase
    .from('max_exam_pack_cache')
    .select('pack, is_sprint')
    .eq('user_id', opts.userId)
    .eq('subject_code', opts.subjectCode)
    .eq('week_label', weekLabel)
    .maybeSingle()

  if (
    cached &&
    isMaxExamPack(cached.pack) &&
    cached.pack.isSprint === sprint &&
    // Bust packs that still deep-link IB subjects at the Cambridge hub (404).
    !JSON.stringify(cached.pack).includes('/past-papers/ib-')
  ) {
    return withCompletionKey(cached.pack, opts.examDate)
  }

  const pack = await buildMaxExamPack({
    supabase: opts.supabase,
    subjectCode: opts.subjectCode,
    masteries: opts.masteries,
    examDate: opts.examDate,
  })

  const { error } = await opts.supabase.from('max_exam_pack_cache').upsert(
    {
      user_id: opts.userId,
      subject_code: opts.subjectCode,
      week_label: pack.weekLabel || weekLabel,
      is_sprint: pack.isSprint,
      pack,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,subject_code,week_label' }
  )
  if (error) {
    console.warn('[max-pack-cache] upsert failed:', error.message)
  }

  return pack
}
