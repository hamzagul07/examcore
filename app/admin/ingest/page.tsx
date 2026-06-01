import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import IngestClient from './ingest-client'

export default async function AdminIngestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isAdminUser(user)) {
    redirect('/dashboard')
  }

  return <IngestClient />
}
