/**
 * Persist derived mark schemes so remakes of the same freeform question share
 * one rubric. Service-role only.
 *
 * Prefers the `derived_mark_schemes` table when migrated. Until then (or if the
 * table is unavailable), falls back to a private Storage bucket so remake
 * stability still ships without a DB password / DDL step.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DerivedMarkScheme } from '@/lib/marking/derive-scheme'

const STORAGE_BUCKET = 'derived-mark-schemes'
/** After a "table missing / schema cache" miss, retry the table again later. */
const TABLE_COOLDOWN_MS = 60_000

let _admin: SupabaseClient | null = null
let _bucketReady: Promise<void> | null = null
/** Epoch ms — while Date.now() < this, skip table and use Storage. */
let _tableCooldownUntil = 0

function admin(): SupabaseClient {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

function tableCoolingDown(): boolean {
  return Date.now() < _tableCooldownUntil
}

function markTableUnavailableTemporarily(): void {
  _tableCooldownUntil = Date.now() + TABLE_COOLDOWN_MS
}

function markTableAvailable(): void {
  _tableCooldownUntil = 0
}

/** Test-only: clear cooldown / cached client state between cases. */
export function resetDerivedSchemeCacheStateForTests(): void {
  _tableCooldownUntil = 0
  _bucketReady = null
}

export type CachedDerivedScheme = {
  fingerprint: string
  scheme: DerivedMarkScheme
  total_marks: number
  source: 'cache' | 'fresh'
}

export type WriteDerivedSchemeResult = 'written' | 'exists' | 'failed'

type StoredPayload = {
  fingerprint: string
  scheme: DerivedMarkScheme
  total_marks: number
  subject_code?: string | null
  exam_system?: string | null
  created_at?: string
}

function isValidScheme(scheme: unknown): scheme is DerivedMarkScheme {
  return (
    !!scheme &&
    typeof scheme === 'object' &&
    Array.isArray((scheme as DerivedMarkScheme).marks)
  )
}

async function ensureStorageBucket(): Promise<void> {
  if (_bucketReady) return _bucketReady
  _bucketReady = (async () => {
    const sb = admin()
    const { data: buckets } = await sb.storage.listBuckets()
    if (buckets?.some((b) => b.name === STORAGE_BUCKET)) return
    const { error } = await sb.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: 256_000,
      allowedMimeTypes: ['application/json'],
    })
    // Race: another instance created it first.
    if (error && !/already exists/i.test(error.message)) {
      console.warn('[mark] derived-scheme storage bucket create failed', error.message)
    }
  })()
  return _bucketReady
}

function storagePath(fingerprint: string): string {
  return `${fingerprint}.json`
}

function isTableMissingError(message: string): boolean {
  return /schema cache|does not exist|Could not find the table/i.test(message)
}

async function lookupTable(
  fingerprint: string
): Promise<CachedDerivedScheme | null> {
  if (tableCoolingDown()) return null
  try {
    const { data, error } = await admin()
      .from('derived_mark_schemes')
      .select('fingerprint, scheme, total_marks, hit_count')
      .eq('fingerprint', fingerprint)
      .maybeSingle()
    if (error) {
      if (isTableMissingError(error.message)) {
        markTableUnavailableTemporarily()
      }
      return null
    }
    markTableAvailable()
    if (!data?.scheme || !isValidScheme(data.scheme)) return null
    const hits = typeof data.hit_count === 'number' ? data.hit_count : 0
    void admin()
      .from('derived_mark_schemes')
      .update({
        hit_count: hits + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('fingerprint', fingerprint)
      .then(
        () => undefined,
        () => undefined
      )
    return {
      fingerprint,
      scheme: data.scheme,
      total_marks:
        typeof data.total_marks === 'number' && data.total_marks > 0
          ? data.total_marks
          : data.scheme.total_marks,
      source: 'cache',
    }
  } catch {
    return null
  }
}

async function lookupStorage(
  fingerprint: string
): Promise<CachedDerivedScheme | null> {
  try {
    await ensureStorageBucket()
    const { data, error } = await admin()
      .storage.from(STORAGE_BUCKET)
      .download(storagePath(fingerprint))
    if (error || !data) return null
    const text = await data.text()
    const parsed = JSON.parse(text) as StoredPayload
    if (!isValidScheme(parsed.scheme)) return null
    return {
      fingerprint,
      scheme: parsed.scheme,
      total_marks:
        typeof parsed.total_marks === 'number' && parsed.total_marks > 0
          ? parsed.total_marks
          : parsed.scheme.total_marks,
      source: 'cache',
    }
  } catch (err) {
    console.warn('[mark] derived-scheme storage lookup failed', err)
    return null
  }
}

export async function lookupDerivedScheme(
  fingerprint: string
): Promise<CachedDerivedScheme | null> {
  if (!fingerprint) return null
  const fromTable = await lookupTable(fingerprint)
  if (fromTable) return fromTable
  return lookupStorage(fingerprint)
}

async function writeTable(params: {
  fingerprint: string
  scheme: DerivedMarkScheme
  totalMarks: number
  subjectCode?: string | null
  examSystem?: string | null
}): Promise<WriteDerivedSchemeResult | 'unavailable'> {
  if (tableCoolingDown()) return 'unavailable'
  try {
    // Insert-only: never overwrite an existing fingerprint.
    const { error } = await admin().from('derived_mark_schemes').insert({
      fingerprint: params.fingerprint,
      scheme: params.scheme,
      total_marks: params.totalMarks,
      subject_code: params.subjectCode ?? null,
      exam_system: params.examSystem ?? null,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        markTableAvailable()
        return 'exists'
      }
      if (isTableMissingError(error.message)) {
        markTableUnavailableTemporarily()
        return 'unavailable'
      }
      console.warn('[mark] derived-scheme table write failed', error.message)
      return 'failed'
    }
    markTableAvailable()
    return 'written'
  } catch {
    return 'failed'
  }
}

async function writeStorage(params: {
  fingerprint: string
  scheme: DerivedMarkScheme
  totalMarks: number
  subjectCode?: string | null
  examSystem?: string | null
}): Promise<WriteDerivedSchemeResult> {
  try {
    await ensureStorageBucket()
    const path = storagePath(params.fingerprint)
    const payload: StoredPayload = {
      fingerprint: params.fingerprint,
      scheme: params.scheme,
      total_marks: params.totalMarks,
      subject_code: params.subjectCode ?? null,
      exam_system: params.examSystem ?? null,
      created_at: new Date().toISOString(),
    }
    // Insert-only (upsert: false): remakes must keep the first rubric.
    const { error } = await admin()
      .storage.from(STORAGE_BUCKET)
      .upload(path, JSON.stringify(payload), {
        contentType: 'application/json',
        upsert: false,
      })
    if (!error) return 'written'
    if (
      /already exists|Duplicate|The resource already exists|409/i.test(
        error.message
      )
    ) {
      return 'exists'
    }
    console.warn('[mark] derived-scheme storage write failed', error.message)
    return 'failed'
  } catch (err) {
    console.warn('[mark] derived-scheme storage write failed', err)
    return 'failed'
  }
}

export async function writeDerivedScheme(params: {
  fingerprint: string
  scheme: DerivedMarkScheme
  totalMarks: number
  subjectCode?: string | null
  examSystem?: string | null
}): Promise<WriteDerivedSchemeResult> {
  if (!params.fingerprint || !params.scheme) return 'failed'
  try {
    const tableResult = await writeTable(params)
    if (tableResult === 'written' || tableResult === 'exists') return tableResult
    return await writeStorage(params)
  } catch (err) {
    console.warn('[mark] derived-scheme cache write failed', err)
    return 'failed'
  }
}
