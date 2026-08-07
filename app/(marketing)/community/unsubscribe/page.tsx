import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import {
  unsubscribeColumnPatch,
  unsubscribeLabel,
  verifyUnsubscribeToken,
} from '@/lib/community/email-unsubscribe'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Email preferences — Exam Room',
  description: 'Manage Exam Room email notifications.',
  path: '/community/unsubscribe',
  index: false,
})

type PageProps = { searchParams: Promise<{ token?: string; done?: string }> }

/**
 * The opt-out itself. Deliberately a POST: rendering this page used to switch
 * the preference off as a side effect of GET, which meant anything that merely
 * *fetched* the link — a mail scanner, a corporate link-rewriter, a prefetch —
 * unsubscribed the student without them ever choosing to. The link now only
 * asks the question; this action answers it.
 *
 * Providers doing RFC 8058 one-click still POST to /api/email/unsubscribe and
 * never reach this page.
 */
async function confirmUnsubscribe(formData: FormData) {
  'use server'

  const token = String(formData.get('token') ?? '')
  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) redirect('/community/unsubscribe')

  const admin = createServiceClient()
  await admin
    .from('user_profiles')
    .update({
      ...unsubscribeColumnPatch(parsed.kind),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.userId)

  redirect(`/community/unsubscribe?token=${encodeURIComponent(token)}&done=1`)
}

export default async function CommunityUnsubscribePage({ searchParams }: PageProps) {
  const { token, done } = await searchParams
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

  const label = unsubscribeLabel(parsed.kind)

  if (done !== '1') {
    return (
      <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 className="ms-h2" style={{ fontSize: 28 }}>
          Unsubscribe?
        </h1>
        <p className="ms-body-2" style={{ marginTop: 12 }}>
          This turns off <strong>{label}</strong> for your account. You&apos;ll still get in-app
          notifications in the bell when you&apos;re signed in, and everything else stays as it is.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="ec-btn-primary">
              Unsubscribe me
            </button>
          </form>
          <Link href="/account/preferences" className="ec-btn-ghost">
            Keep them, open preferences
          </Link>
        </div>
      </div>
    )
  }

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
