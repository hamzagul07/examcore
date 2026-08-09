import { Suspense } from 'react'
import { cookies, headers } from 'next/headers'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createClient } from '@/lib/supabase-server'
import { resolveRegion, REGION_COOKIE } from '@/lib/billing/region-cookie'
import { getPricingDisplay, type PricingDisplay } from '@/lib/billing/display-prices'
import { pricingSeoDescription } from '@/lib/billing/pricing-copy'
import type { RegionChoice } from '@/lib/billing/region-cookie'
import type { SubscriptionTier } from '@/lib/database.types'
import { PricingMarginNotesPage } from '@/components/courses/margin-notes/PricingMarginNotesPage'

export const dynamic = 'force-dynamic'

export const metadata = getPageMetadata('/pricing')

async function loadPricingAccount(): Promise<{
  signedIn: boolean
  currentTier: SubscriptionTier | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { signedIn: false, currentTier: null }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    signedIn: true,
    currentTier: (sub?.tier as SubscriptionTier) ?? 'free',
  }
}

async function PricingWithAccount({
  display,
  region,
  accountPromise,
}: {
  display: PricingDisplay
  region: RegionChoice
  accountPromise: ReturnType<typeof loadPricingAccount>
}) {
  const { signedIn, currentTier } = await accountPromise
  return (
    <PricingMarginNotesPage
      display={display}
      signedIn={signedIn}
      currentTier={currentTier}
      region={region}
    />
  )
}

export default async function PricingPage() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const region = resolveRegion(
    cookieStore.get(REGION_COOKIE)?.value,
    headerStore.get('x-vercel-ip-country')
  )

  // Start account lookup in parallel with prices; stream it behind Suspense (PERF-01).
  const accountPromise = loadPricingAccount()
  const display = await getPricingDisplay(region)

  return (
    <>
      <PageJsonLd
        path="/pricing"
        title="Pricing — Cambridge & IB past paper marking"
        description={pricingSeoDescription()}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
      />
      <Suspense
        fallback={
          <PricingMarginNotesPage
            display={display}
            signedIn={false}
            currentTier={null}
            region={region}
          />
        }
      >
        <PricingWithAccount
          display={display}
          region={region}
          accountPromise={accountPromise}
        />
      </Suspense>
    </>
  )
}
