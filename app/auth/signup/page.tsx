import { Suspense } from 'react'
import {
  buildSignInHref,
  isSafeNextPath,
  readPostAuthNextParam,
} from '@/lib/auth-redirect'
import { SignUpFormSkeleton, SignUpPageClient } from './SignUpPageClient'

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

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

function resolveSignUpProps(searchParams: SearchParams) {
  const intent = firstParam(searchParams.intent)
  const topic = firstParam(searchParams.topic)
  const paper = firstParam(searchParams.paper)
  const redirect = readPostAuthNextParam(
    firstParam(searchParams.next),
    firstParam(searchParams.redirect)
  )
  const intentDestination = destinationForIntent(intent, topic, paper, redirect)
  const signInHref = buildSignInHref(
    intentDestination !== '/onboarding' ? intentDestination : null
  )
  return { intentDestination, signInHref, redirect }
}

type Props = { searchParams: Promise<SearchParams> }

export default async function SignUpPage({ searchParams }: Props) {
  const sp = await searchParams
  const props = resolveSignUpProps(sp)

  return (
    <Suspense fallback={<SignUpFormSkeleton signInHref={props.signInHref} />}>
      <SignUpPageClient {...props} />
    </Suspense>
  )
}
