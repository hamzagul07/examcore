'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/AuthShell'
import { GoogleAuthSectionSkeleton } from '@/components/auth/GoogleAuthSection'
import { buildSignInHref, isSafeNextPath, readPostAuthNextParam } from '@/lib/auth-redirect'
import { isContentGateReturnPath } from '@/lib/content-gate'
import { SignUpForm, signUpSubheadForRedirect } from '@/components/auth/SignUpForm'

function destinationForIntent(
  intent: string | null,
  topic: string | null,
  paper: string | null,
  redirect: string | null
): string {
  if (isSafeNextPath(redirect)) return redirect
  if (!intent) return '/onboarding'
  switch (intent) {
    case 'mark':
      return paper ? `/mark?paper=${encodeURIComponent(paper)}` : '/mark'
    case 'diagnostic':
      return topic ? `/mark?topic=${encodeURIComponent(topic)}` : '/mark'
    case 'upload':
      return '/mark'
    case 'solution':
      return topic ? `/dashboard?topic=${encodeURIComponent(topic)}` : '/dashboard'
    default:
      return '/onboarding'
  }
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFormSkeleton />}>
      <SignUpPageInner />
    </Suspense>
  )
}

function SignUpFormSkeleton() {
  return (
    <AuthShell backLabel="Back to sign in" backHref="/auth/signin">
      <p className="ec-eyebrow mb-3">Get started</p>
      <h1 className="text-hero mb-3">
        Create your <span className="ec-text-gradient">account</span>
      </h1>
      <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
        Free tier included — Cambridge or IB Diploma, pick your subjects in onboarding.
      </p>
      <GoogleAuthSectionSkeleton label="Sign up with Google" />
    </AuthShell>
  )
}

function SignUpPageInner() {
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')
  const topic = searchParams.get('topic')
  const paper = searchParams.get('paper')
  const redirect = readPostAuthNextParam(
    searchParams.get('next'),
    searchParams.get('redirect')
  )

  const intentDestination = useMemo(
    () => destinationForIntent(intent, topic, paper, redirect),
    [intent, topic, paper, redirect]
  )

  const signInHref = useMemo(
    () =>
      buildSignInHref(
        intentDestination !== '/onboarding' ? intentDestination : null
      ),
    [intentDestination]
  )

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
