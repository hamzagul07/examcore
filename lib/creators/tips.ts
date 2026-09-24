/**
 * Tip tests (docs/CREATORS_PROGRAM.md): a creator's tip attached to a real
 * question. Followers answer the question using the tip; the creator sees
 * whether the tip works — how many tried it, the average score, how many got
 * full marks. Attempts carry `tip_test_id` the way they carry `creator_code`.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { getSubjectByCode } from '@/lib/profile-options'

export type TipTest = {
  id: string
  creatorId: string
  slug: string
  title: string
  tip: string
  subjectCode: string
  subjectLabel: string
  questionText: string
  totalMarks: number
  status: 'active' | 'paused'
  createdAt: string
}

export type TipTestStats = {
  attempts: number
  /** Mean percentage across attempts, null until there is one. */
  avgPct: number | null
  fullMarks: number
}

export type TipTestWithStats = TipTest & { stats: TipTestStats }

type Row = {
  id: string
  creator_id: string
  slug: string
  title: string
  tip: string
  subject_code: string
  question_text: string
  total_marks: number
  status: 'active' | 'paused'
  created_at: string
}

const COLUMNS =
  'id, creator_id, slug, title, tip, subject_code, question_text, total_marks, status, created_at'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function slugifyTipTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return slug.length >= 3 ? slug : `tip-${slug || 'test'}`
}

export function subjectLabelFor(code: string): string {
  const s = getSubjectByCode(code)
  return s ? `${s.label} (${code})` : code
}

function mapRow(r: Row): TipTest {
  return {
    id: r.id,
    creatorId: r.creator_id,
    slug: r.slug,
    title: r.title,
    tip: r.tip,
    subjectCode: r.subject_code,
    subjectLabel: subjectLabelFor(r.subject_code),
    questionText: r.question_text,
    totalMarks: r.total_marks,
    status: r.status,
    createdAt: r.created_at,
  }
}

async function statsFor(ids: string[]): Promise<Map<string, TipTestStats>> {
  const out = new Map<string, TipTestStats>()
  for (const id of ids) out.set(id, { attempts: 0, avgPct: null, fullMarks: 0 })
  if (!ids.length) return out
  const admin = createServiceClient()
  const { data } = await admin
    .from('attempts')
    .select('tip_test_id, marks_earned, total_marks')
    .in('tip_test_id', ids)
    .gt('total_marks', 0)
    .limit(5000)
  const sums = new Map<string, { n: number; pct: number; full: number }>()
  for (const r of data ?? []) {
    const id = r.tip_test_id as string
    const earned = Number(r.marks_earned ?? 0)
    const total = Number(r.total_marks ?? 0)
    if (!total) continue
    const s = sums.get(id) ?? { n: 0, pct: 0, full: 0 }
    s.n += 1
    s.pct += (earned / total) * 100
    if (earned >= total) s.full += 1
    sums.set(id, s)
  }
  for (const [id, s] of sums) {
    out.set(id, { attempts: s.n, avgPct: s.n ? Math.round(s.pct / s.n) : null, fullMarks: s.full })
  }
  return out
}

async function withStats(rows: Row[]): Promise<TipTestWithStats[]> {
  const tips = rows.map(mapRow)
  const stats = await statsFor(tips.map((t) => t.id))
  return tips.map((t) => ({
    ...t,
    stats: stats.get(t.id) ?? { attempts: 0, avgPct: null, fullMarks: 0 },
  }))
}

export async function listTipTests(
  creatorId: string,
  opts: { activeOnly?: boolean } = {}
): Promise<TipTestWithStats[]> {
  const admin = createServiceClient()
  let q = admin
    .from('creator_tip_tests')
    .select(COLUMNS)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (opts.activeOnly) q = q.eq('status', 'active')
  const { data } = await q
  return withStats((data ?? []) as Row[])
}

export async function getTipTest(id: string): Promise<TipTestWithStats | null> {
  if (!UUID_RE.test(id)) return null
  const admin = createServiceClient()
  const { data } = await admin.from('creator_tip_tests').select(COLUMNS).eq('id', id).maybeSingle()
  if (!data) return null
  const [tip] = await withStats([data as Row])
  return tip ?? null
}

export async function getTipTestBySlug(
  creatorId: string,
  slug: string
): Promise<TipTestWithStats | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('creator_tip_tests')
    .select(COLUMNS)
    .eq('creator_id', creatorId)
    .eq('slug', slug.toLowerCase())
    .maybeSingle()
  if (!data) return null
  const [tip] = await withStats([data as Row])
  return tip ?? null
}

export type CreateTipTestInput = {
  creatorId: string
  title: string
  tip: string
  subjectCode: string
  questionText: string
  totalMarks: number
}

export async function createTipTest(
  input: CreateTipTestInput
): Promise<{ ok: true; tip: TipTest } | { ok: false; error: string }> {
  const title = input.title.trim().replace(/\s+/g, ' ')
  const tip = input.tip.trim()
  const questionText = input.questionText.trim()
  const subjectCode = input.subjectCode.trim()
  const totalMarks = Math.round(Number(input.totalMarks))
  if (title.length < 4 || title.length > 90) return { ok: false, error: 'Give the tip a title of 4–90 characters.' }
  if (tip.length < 10 || tip.length > 600) return { ok: false, error: 'Write the tip in 10–600 characters.' }
  if (questionText.length < 10 || questionText.length > 4000)
    return { ok: false, error: 'Paste a question of 10–4000 characters.' }
  if (!getSubjectByCode(subjectCode)) return { ok: false, error: 'Pick a subject the marker knows.' }
  if (!Number.isFinite(totalMarks) || totalMarks < 1 || totalMarks > 50)
    return { ok: false, error: 'Total marks must be between 1 and 50.' }

  const admin = createServiceClient()
  const base = slugifyTipTitle(title)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base.slice(0, 56)}-${attempt + 1}`
    const { data, error } = await admin
      .from('creator_tip_tests')
      .insert({
        creator_id: input.creatorId,
        slug,
        title,
        tip,
        subject_code: subjectCode,
        question_text: questionText,
        total_marks: totalMarks,
      })
      .select(COLUMNS)
      .single()
    if (!error && data) return { ok: true, tip: mapRow(data as Row) }
    if (error?.code !== '23505') {
      console.error('[creators] tip test insert failed', error?.message)
      return { ok: false, error: 'Could not save the tip test. Try again.' }
    }
  }
  return { ok: false, error: 'A tip test with that title already exists. Change the title.' }
}

export async function setTipTestStatus(
  id: string,
  creatorId: string,
  status: 'active' | 'paused'
): Promise<boolean> {
  if (!UUID_RE.test(id)) return false
  const admin = createServiceClient()
  const { error } = await admin
    .from('creator_tip_tests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('creator_id', creatorId)
  return !error
}

/** The id to stamp on a run, or null. Active tip of an active creator only; never throws. */
export async function resolveTipTestIdForRun(raw: unknown): Promise<string | null> {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) return null
  try {
    const admin = createServiceClient()
    const { data } = await admin
      .from('creator_tip_tests')
      .select('id, creator_id, status')
      .eq('id', raw)
      .eq('status', 'active')
      .maybeSingle()
    if (!data) return null
    const { data: creator } = await admin
      .from('creators')
      .select('status')
      .eq('user_id', data.creator_id as string)
      .maybeSingle()
    return creator?.status === 'active' ? (data.id as string) : null
  } catch (err) {
    console.warn('[creators] tip test lookup failed (mark continues)', err)
    return null
  }
}
