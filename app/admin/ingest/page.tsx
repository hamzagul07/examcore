import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import IngestClient from './ingest-client'

const OWNER_EMAIL = 'hg9256970@gmail.com'

export default async function AdminIngestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    redirect('/dashboard')
  }

  return <IngestClient />
}
