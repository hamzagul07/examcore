import { AuthShell } from '@/components/AuthShell'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Sign out',
  description: 'Sign out of your MarkScheme desk.',
  path: '/auth/signout/confirm',
  index: false,
})

/**
 * The GET half of sign-out. Signing out is a POST to /auth/signout (a GET
 * that signed out was a CSRF logout — review §3), but a few places can only
 * offer a link: the onboarding wizard's back link, old bookmarks. They land
 * here and sign out with one deliberate click. Server component on purpose —
 * a plain form needs no JavaScript to work.
 */
export default function SignOutConfirmPage() {
  return (
    <AuthShell showBetaBadge={false} backLabel="Stay signed in" backHref="/dashboard">
      <div className="ms-signup-desk">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">Marking desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            OUT
          </span>
        </div>
        <h1 className="text-hero mb-3">
          Sign <em>out</em>?
        </h1>
        <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
          Your marks, progress and setup stay exactly where they are. Sign back
          in any time to pick up where you left off.
        </p>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="ec-btn-primary w-full justify-center">
            Sign out
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
