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

let _admin: SupabaseClient | null = null
let _bucketReady: Promise<void> | null = null
let _tableAvailable: boolean | null = null

function admin(): SupabaseClient {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

export type CachedDerivedScheme = {
  fingerprint: string
  scheme: DerivedMarkScheme
  total_marks: number
  source: 'cache' | 'fresh'
}

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

async function lookupTable(
  fingerprint: string
): Promise<CachedDerivedScheme | null> {
  if (_tableAvailable === false) return null
  try {
    const { data, error } = await admin()
      .from('derived_mark_schemes')
      .select('fingerprint, scheme, total_marks, hit_count')
      .eq('fingerprint', fingerprint)
      .maybeSingle()
    if (error) {
      if (/schema cache|does not exist|Could not find the table/i.test(error.message)) {
        _tableAvailable = false
      }
      return null
    }
    _tableAvailable = true
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
}): Promise<boolean> {
  if (_tableAvailable === false) return false
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
        _tableAvailable = true
        return true
      }
      if (/schema cache|does not exist|Could not find the table/i.test(error.message)) {
        _tableAvailable = false
        return false
      }
      console.warn('[mark] derived-scheme table write failed', error.message)
      return false
    }
    _tableAvailable = true
    return true
  } catch {
    return false
  }
}

async function writeStorage(params: {
  fingerprint: string
  scheme: DerivedMarkScheme
  totalMarks: number
  subjectCode?: string | null
  examSystem?: string | null
}): Promise<void> {
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
  if (
    error &&
    !/already exists|Duplicate|The resource already exists|409/i.test(
      error.message
    )
  ) {
    console.warn('[mark] derived-scheme storage write failed', error.message)
  }
}

export async function writeDerivedScheme(params: {
  fingerprint: string
  scheme: DerivedMarkScheme
  totalMarks: number
  subjectCode?: string | null
  examSystem?: string | null
}): Promise<void> {
  if (!params.fingerprint || !params.scheme) return
  try {
    const wroteTable = await writeTable(params)
    if (wroteTable) return
    await writeStorage(params)
  } catch (err) {
    console.warn('[mark] derived-scheme cache write failed', err)
  }
}
