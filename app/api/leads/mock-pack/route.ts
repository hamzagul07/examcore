import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  checkSignupRateLimit,
  clientIp,
  incrementSignupRateLimit,
} from '@/lib/rate-limit'
import { HONEYPOT_FIELD, isHoneypotTripped } from '@/lib/honeypot'
import { rateLimitJson } from '@/lib/http/rate-limit-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  email?: string
  source?: string
  syllabusCode?: string
  rawMark?: number | string
  predictedGrade?: string
  company?: string
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (isHoneypotTripped(body[HONEYPOT_FIELD])) {
    return NextResponse.json({ ok: true })
  }

  const email = (body.email || '').trim().toLowerCase().slice(0, 120)
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const source = (body.source || 'results-2026').trim().slice(0, 64) || 'results-2026'
  const syllabusCode =
    typeof body.syllabusCode === 'string' && /^\d{4}$/.test(body.syllabusCode)
      ? body.syllabusCode
      : null
  const rawParsed =
    body.rawMark === undefined || body.rawMark === ''
      ? null
      : Number(body.rawMark)
  const rawMark =
    rawParsed != null && Number.isFinite(rawParsed) ? rawParsed : null
  const predictedGrade =
    typeof body.predictedGrade === 'string'
      ? body.predictedGrade.trim().slice(0, 8) || null
      : null

  const admin = createServiceClient()
  const ip = clientIp(request)
  const rate = await checkSignupRateLimit(admin, ip)
  if (!rate.allowed) {
    return rateLimitJson(rate.message)
  }

  const row = {
    email,
    source,
    syllabus_code: syllabusCode,
    raw_mark: rawMark,
    predicted_grade: predictedGrade,
    metadata: { ip_bucket: ip.slice(0, 24) },
  }

  const { data: existing } = await admin
    .from('marketing_leads')
    .select('id')
    .eq('email', email)
    .eq('source', source)
    .maybeSingle()

  const { error } = existing
    ? await admin.from('marketing_leads').update(row).eq('id', existing.id)
    : await admin.from('marketing_leads').insert(row)

  if (error) {
    console.error('[leads/mock-pack]', error.message)
    return NextResponse.json(
      { error: 'Could not save your email. Try again in a moment.' },
      { status: 500 }
    )
  }

  await incrementSignupRateLimit(admin, ip, rate.count)
  return NextResponse.json({ ok: true })
}
