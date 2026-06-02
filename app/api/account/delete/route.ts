import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'

type Body = {
  confirm?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account removal.' },
      { status: 400 }
    )
  }

  const admin = createServiceClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('[account/delete]', error)
    return NextResponse.json(
      { error: 'Could not delete your account. Contact hello@markscheme.app for help.' },
      { status: 500 }
    )
  }

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
