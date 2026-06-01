import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const admin = createServiceClient()

  const [
    { data: profile },
    { data: attempts },
    { data: subscription },
    { data: credits },
    { data: usage },
  ] = await Promise.all([
    admin.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
    admin
      .from('attempts')
      .select(
        `
        id, marks_earned, total_marks, source_type, question_text,
        syllabus_tags, error_classifications, created_at,
        mark_schemes ( paper_code, paper_session, question_number, subject )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('user_subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    admin.from('user_credits').select('*').eq('user_id', user.id).maybeSingle(),
    admin
      .from('usage_events')
      .select('event_type, source, credits_delta, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const exportPayload = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile ?? null,
    subscription: subscription ?? null,
    credits: credits ?? null,
    attempts: attempts ?? [],
    usage_events: usage ?? [],
  }

  const filename = `examcore-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
