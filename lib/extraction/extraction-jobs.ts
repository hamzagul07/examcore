import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExtractionJob, ExtractionPdfType, ExtractionJobStatus } from './types'

export type JobSkipReason = 'completed' | 'failed_max_retries' | null

export async function getExtractionJob(
  supabase: SupabaseClient,
  sourcePdfPath: string
): Promise<ExtractionJob | null> {
  const { data, error } = await supabase
    .from('extraction_jobs')
    .select('*')
    .eq('source_pdf_path', sourcePdfPath)
    .maybeSingle()
  if (error) throw new Error(`extraction_jobs lookup failed: ${error.message}`)
  return data as ExtractionJob | null
}

export function shouldSkipJob(job: ExtractionJob | null): JobSkipReason {
  if (!job) return null
  if (job.status === 'completed') return 'completed'
  if (job.status === 'failed' && job.retry_count >= 3) return 'failed_max_retries'
  return null
}

export async function ensureExtractionJob(
  supabase: SupabaseClient,
  sourcePdfPath: string,
  pdfType: ExtractionPdfType
): Promise<ExtractionJob> {
  const existing = await getExtractionJob(supabase, sourcePdfPath)
  if (existing) return existing

  const { data, error } = await supabase
    .from('extraction_jobs')
    .insert({
      source_pdf_path: sourcePdfPath,
      pdf_type: pdfType,
      status: 'pending' as ExtractionJobStatus,
    })
    .select('*')
    .single()

  if (error) {
    const again = await getExtractionJob(supabase, sourcePdfPath)
    if (again) return again
    throw new Error(`extraction_jobs insert failed: ${error.message}`)
  }
  return data as ExtractionJob
}

export async function markJobRunning(
  supabase: SupabaseClient,
  sourcePdfPath: string
): Promise<void> {
  const { error } = await supabase
    .from('extraction_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('source_pdf_path', sourcePdfPath)
  if (error) throw new Error(`markJobRunning failed: ${error.message}`)
}

export type JobCompleteStats = {
  pages_processed?: number
  questions_extracted?: number
  diagrams_extracted?: number
  cost_usd?: number
  error_message?: string | null
  metadata?: Record<string, unknown>
}

export async function markJobCompleted(
  supabase: SupabaseClient,
  sourcePdfPath: string,
  stats: JobCompleteStats = {}
): Promise<void> {
  const update: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    pages_processed: stats.pages_processed ?? 0,
    questions_extracted: stats.questions_extracted ?? 0,
    diagrams_extracted: stats.diagrams_extracted ?? 0,
    cost_usd: stats.cost_usd ?? 0,
    error_message: stats.error_message ?? null,
  }

  if (stats.metadata && Object.keys(stats.metadata).length > 0) {
    const existing = await getExtractionJob(supabase, sourcePdfPath)
    const prev =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {}
    update.metadata = { ...prev, ...stats.metadata }
  }

  let { error } = await supabase
    .from('extraction_jobs')
    .update(update)
    .eq('source_pdf_path', sourcePdfPath)

  if (error && update.metadata && /metadata/i.test(error.message)) {
    const withoutMeta = { ...update }
    delete withoutMeta.metadata
    ;({ error } = await supabase
      .from('extraction_jobs')
      .update(withoutMeta)
      .eq('source_pdf_path', sourcePdfPath))
  }

  if (error) throw new Error(`markJobCompleted failed: ${error.message}`)
}

/** Reset jobs stuck in `running` longer than maxAgeMs (default 1 hour). */
export async function resetStaleRunningJobs(
  supabase: SupabaseClient,
  maxAgeMs = 60 * 60 * 1000
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()
  const { data, error } = await supabase
    .from('extraction_jobs')
    .update({
      status: 'pending',
      started_at: null,
      error_message: 'reset: stale running job',
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('source_pdf_path')

  if (error) throw new Error(`resetStaleRunningJobs failed: ${error.message}`)
  return data?.length ?? 0
}

/** Reset zero-cost failed/running jobs so bulk resume re-processes them. */
export async function resetSilentFailureJobs(
  supabase: SupabaseClient,
  subjectCode: string
): Promise<number> {
  const { data: jobs, error: listErr } = await supabase
    .from('extraction_jobs')
    .select('source_pdf_path, status, cost_usd')
    .like('source_pdf_path', `%/${subjectCode}/%`)

  if (listErr) throw new Error(`resetSilentFailureJobs list failed: ${listErr.message}`)

  const toReset = (jobs ?? []).filter(
    (j) =>
      Number(j.cost_usd) === 0 &&
      (j.status === 'failed' || j.status === 'running' || j.status === 'completed')
  )

  if (!toReset.length) return 0

  const paths = toReset.map((j) => j.source_pdf_path)
  const { data, error } = await supabase
    .from('extraction_jobs')
    .update({
      status: 'pending',
      retry_count: 0,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .in('source_pdf_path', paths)
    .select('source_pdf_path')

  if (error) throw new Error(`resetSilentFailureJobs update failed: ${error.message}`)
  return data?.length ?? 0
}

export async function markJobFailed(
  supabase: SupabaseClient,
  sourcePdfPath: string,
  errorMessage: string,
  stats: JobCompleteStats = {}
): Promise<void> {
  const job = await getExtractionJob(supabase, sourcePdfPath)
  const retryCount = (job?.retry_count ?? 0) + 1

  const { error } = await supabase
    .from('extraction_jobs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      retry_count: retryCount,
      error_message: errorMessage.slice(0, 4000),
      pages_processed: stats.pages_processed ?? job?.pages_processed ?? 0,
      questions_extracted: stats.questions_extracted ?? job?.questions_extracted ?? 0,
      diagrams_extracted: stats.diagrams_extracted ?? job?.diagrams_extracted ?? 0,
      cost_usd: stats.cost_usd ?? job?.cost_usd ?? 0,
    })
    .eq('source_pdf_path', sourcePdfPath)
  if (error) throw new Error(`markJobFailed failed: ${error.message}`)
}
