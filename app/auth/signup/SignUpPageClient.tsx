'use client'

import { AuthShell } from '@/components/AuthShell'
import { GoogleAuthSectionSkeleton } from '@/components/auth/GoogleAuthSection'
import { SignupDeskArtefact } from '@/components/auth/SignupDeskArtefact'
import { isContentGateReturnPath } from '@/lib/content-gate'
import { SignUpForm, signUpSubheadForRedirect } from '@/components/auth/SignUpForm'

type Props = {
  intentDestination: string
  signInHref: string
  redirect: string | null
}

export function SignUpPageClient({ intentDestination, signInHref, redirect }: Props) {
  const contentGateRedirect = isContentGateReturnPath(redirect) ? redirect : null

  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={signInHref}
      aside={<SignupDeskArtefact />}
    >
      <SignUpForm
        redirectPath={intentDestination}
        signInHref={signInHref}
        signupSubhead={signUpSubheadForRedirect(redirect)}
        showBlogReturnHint={Boolean(redirect?.startsWith('/blog/'))}
        showContentReturnHint={Boolean(contentGateRedirect)}
        guestBrowseSkipPath={contentGateRedirect}
      />
    </AuthShell>
  )
}

export function SignUpFormSkeleton({ signInHref = '/auth/signin' }: { signInHref?: string }) {
  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={signInHref}
      aside={<SignupDeskArtefact />}
    >
      <div className="ms-signup-desk">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">Marking desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
        </div>
        <p className="text-hero mb-3" aria-hidden="true">
          Open your <em>marking desk</em>
        </p>
        <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
          Free marks against real schemes. About 60 seconds to file your subjects after.
        </p>
        <GoogleAuthSectionSkeleton label="Sign up with Google" />
      </div>
    </AuthShell>
  )
}
