import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { CelebrationKey } from '@/lib/onboarding'

const VALID_KEYS = new Set<CelebrationKey>([
  'onboarding_complete',
  'first_mark',
  'first_exam_ready',
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: { key?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const key = body.key as CelebrationKey
  if (!key || !VALID_KEYS.has(key)) {
    return NextResponse.json({ error: 'Invalid celebration key' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('celebrations_seen')
    .eq('id', user.id)
    .maybeSingle()

  const seen = profile?.celebrations_seen ?? []
  if (seen.includes(key)) {
    return NextResponse.json({ show: false })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      celebrations_seen: [...seen, key],
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[celebrations]', error)
    return NextResponse.json({ error: 'Could not record celebration' }, { status: 500 })
  }

  return NextResponse.json({ show: true })
}
