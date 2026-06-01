import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

type Body = {
  email_exam_reminders?: boolean
  email_product_updates?: boolean
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const patch: Record<string, boolean> = {}
  if (typeof body.email_exam_reminders === 'boolean') {
    patch.email_exam_reminders = body.email_exam_reminders
  }
  if (typeof body.email_product_updates === 'boolean') {
    patch.email_product_updates = body.email_product_updates
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('[account/preferences] update failed:', error)
    return NextResponse.json(
      { error: 'Could not save your preferences. Try again in a moment.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, ...patch })
}
