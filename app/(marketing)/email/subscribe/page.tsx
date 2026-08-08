import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import {
  subscribeColumnPatch,
  unsubscribeLabel,
  verifyUnsubscribeToken,
} from '@/lib/community/email-unsubscribe'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Email preferences — MarkScheme',
  description: 'Turn on MarkScheme email updates.',
  path: '/email/subscribe',
  index: false,
})

type PageProps = { searchParams: Promise<{ token?: string; done?: string }> }

/**
 * Grants consent. A POST for the same reason the unsubscribe page is a POST,
 * only more so: a link that opts somebody IN when merely fetched would
 * manufacture consent that was never given, and this page exists precisely to
 * create an honest record of it.
 */
async function confirmSubscribe(formData: FormData) {
  'use server'

  const token = String(formData.get('token') ?? '')
  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) redirect('/email/subscribe')

  const admin = createServiceClient()
  await admin
    .from('user_profiles')
    .update({
      ...subscribeColumnPatch(parsed.kind),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.userId)

  redirect(`/email/subscribe?token=${encodeURIComponent(token)}&done=1`)
}

export default async function EmailSubscribePage({ searchParams }: PageProps) {
  const { token, done } = await searchParams
  const parsed = token ? verifyUnsubscribeToken(token) : null

  if (!parsed) {
    return (
      <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 className="ms-h2" style={{ fontSize: 28 }}>
          Invalid or expired link
        </h1>
        <p className="ms-body-2" style={{ marginTop: 12 }}>
          This link is no longer valid. You can change email settings in your account.
        </p>
        <Link
          href="/account/preferences"
          className="ec-btn-primary"
          style={{ marginTop: 24, display: 'inline-flex' }}
        >
          Open preferences
        </Link>
      </div>
    )
  }

  const label = unsubscribeLabel(parsed.kind)

  if (done === '1') {
    return (
      <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 className="ms-h2" style={{ fontSize: 28 }}>
          You&apos;re in
        </h1>
        <p className="ms-body-2" style={{ marginTop: 12 }}>
          We turned on <strong>{label}</strong>. No more than twice a month, and every one
          has a one-click unsubscribe.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          <Link href="/mark" className="ec-btn-primary">
            Mark a question
          </Link>
          <Link href="/account/preferences" className="ec-btn-ghost">
            Email preferences
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rc-page rc-page-narrow" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 className="ms-h2" style={{ fontSize: 28 }}>
        Turn on {label}?
      </h1>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        You&apos;ll get occasional updates about new subjects, features and study guidance —
        no more than twice a month, and you can turn it off in one click from any email.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
        <form action={confirmSubscribe}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="ec-btn-primary">
            Yes, send me updates
          </button>
        </form>
        <Link href="/mark" className="ec-btn-ghost">
          No thanks
        </Link>
      </div>
    </div>
  )
}
