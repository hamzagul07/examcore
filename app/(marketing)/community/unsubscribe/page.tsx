import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyUnsubscribeToken } from '@/lib/community/email-unsubscribe'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Email preferences — Exam Room',
  description: 'Manage Exam Room email notifications.',
  path: '/community/unsubscribe',
  index: false,
})

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function CommunityUnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams
  const parsed = token ? verifyUnsubscribeToken(token) : null

  if (!parsed) {
    return (
      <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 className="ms-h2" style={{ fontSize: 28 }}>
          Invalid or expired link
        </h1>
        <p className="ms-body-2" style={{ marginTop: 12 }}>
          This unsubscribe link is no longer valid. You can manage email settings in your account.
        </p>
        <Link href="/account/preferences" className="ec-btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          Open preferences
        </Link>
      </div>
    )
  }

  const admin = createServiceClient()
  const patch =
    parsed.kind === 'replies'
      ? { email_community_replies: false }
      : parsed.kind === 'threads'
        ? { email_community_threads: false }
        : { email_community_digest: false }

  await admin
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', parsed.userId)

  const label =
    parsed.kind === 'replies'
      ? 'Exam Room reply emails'
      : parsed.kind === 'threads'
        ? 'Exam Room thread activity emails'
        : 'Exam Room weekly digest'

  return (
    <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 className="ms-h2" style={{ fontSize: 28 }}>
        You&apos;re unsubscribed
      </h1>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        We turned off <strong>{label}</strong> for your account. You&apos;ll still get in-app
        notifications in the bell when you&apos;re signed in.
      </p>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        Changed your mind? Re-enable anytime in preferences.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
        <Link href="/account/preferences" className="ec-btn-primary">
          Email preferences
        </Link>
        <Link href="/community" className="ec-btn-ghost">
          Back to Exam Room
        </Link>
      </div>
    </div>
  )
}
