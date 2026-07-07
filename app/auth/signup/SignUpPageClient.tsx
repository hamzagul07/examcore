'use client'

import { AuthShell } from '@/components/AuthShell'
import { GoogleAuthSectionSkeleton } from '@/components/auth/GoogleAuthSection'
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
    <AuthShell backLabel="Back to sign in" backHref={signInHref}>
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
    <AuthShell backLabel="Back to sign in" backHref={signInHref}>
      <p className="ec-eyebrow mb-3">Get started</p>
      <p className="text-hero mb-3" aria-hidden="true">
        Create your <span className="ec-text-gradient">account</span>
      </p>
      <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
        Free tier included — Cambridge or IB Diploma, pick your subjects in onboarding.
      </p>
      <GoogleAuthSectionSkeleton label="Sign up with Google" />
    </AuthShell>
  )
}
