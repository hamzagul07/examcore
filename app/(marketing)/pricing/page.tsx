import { cookies, headers } from 'next/headers'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createClient } from '@/lib/supabase-server'
import { resolveRegion, REGION_COOKIE } from '@/lib/billing/region-cookie'
import { getPricingDisplay } from '@/lib/billing/display-prices'
import { effectiveAccess } from '@/lib/billing/access'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'
import { PricingMarginNotesPage } from '@/components/courses/margin-notes/PricingMarginNotesPage'

export const dynamic = 'force-dynamic'

export const metadata = getPageMetadata('/pricing')

export default async function PricingPage() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const region = resolveRegion(
    cookieStore.get(REGION_COOKIE)?.value,
    headerStore.get('x-vercel-ip-country')
  )

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let access: ReturnType<typeof effectiveAccess> = 'free'
  let currentTier: SubscriptionTier | null = null
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('tier, status, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()
    currentTier = (sub?.tier as SubscriptionTier) ?? 'free'
    access = effectiveAccess({
      tier: (sub?.tier as SubscriptionTier) ?? 'free',
      status: (sub?.status as SubscriptionStatus) ?? 'canceled',
      trialEndsAt: sub?.trial_ends_at as string | null | undefined,
    })
  }

  const display = await getPricingDisplay(region)

  return (
    <>
      <PageJsonLd
        path="/pricing"
        title="Pricing — Cambridge & IB past paper marking"
        description="MarkScheme pricing: free courses forever, plus unlimited marking for exam season."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
      />
      <PricingMarginNotesPage
        display={display}
        signedIn={Boolean(user)}
        access={access}
        currentTier={currentTier}
        region={region}
      />
    </>
  )
}
