/**
 * Persist Max Vault pack day completion (sprint or weekly pack).
 * Keyed by the same week_label as max_exam_pack_cache.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadCompletedPackDays(opts: {
  supabase: SupabaseClient
  userId: string
  subjectCode: string
  weekLabel: string
}): Promise<number[]> {
  const { data, error } = await opts.supabase
    .from('max_sprint_day_completion')
    .select('day_number')
    .eq('user_id', opts.userId)
    .eq('subject_code', opts.subjectCode)
    .eq('week_label', opts.weekLabel)

  if (error) {
    console.error('[max/sprint-day] load failed:', error.message)
    return []
  }
  return (data ?? [])
    .map((r) => Number(r.day_number))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 14)
}

export async function setPackDayCompleted(opts: {
  supabase: SupabaseClient
  userId: string
  subjectCode: string
  weekLabel: string
  dayNumber: number
  completed: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const day = Math.floor(opts.dayNumber)
  if (day < 1 || day > 14) return { ok: false, error: 'Invalid day' }

  if (opts.completed) {
    const { error } = await opts.supabase.from('max_sprint_day_completion').upsert(
      {
        user_id: opts.userId,
        subject_code: opts.subjectCode.trim(),
        week_label: opts.weekLabel.trim(),
        day_number: day,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,subject_code,week_label,day_number' }
    )
    if (error) {
      console.error('[max/sprint-day] upsert failed:', error.message)
      return { ok: false, error: 'Could not save' }
    }
    return { ok: true }
  }

  const { error } = await opts.supabase
    .from('max_sprint_day_completion')
    .delete()
    .eq('user_id', opts.userId)
    .eq('subject_code', opts.subjectCode.trim())
    .eq('week_label', opts.weekLabel.trim())
    .eq('day_number', day)

  if (error) {
    console.error('[max/sprint-day] delete failed:', error.message)
    return { ok: false, error: 'Could not save' }
  }
  return { ok: true }
}
