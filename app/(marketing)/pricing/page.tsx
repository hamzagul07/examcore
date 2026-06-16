import { cookies, headers } from 'next/headers'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createClient } from '@/lib/supabase-server'
import { resolveRegion, REGION_COOKIE } from '@/lib/billing/region-cookie'
import { getPricingDisplay } from '@/lib/billing/display-prices'
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

  let founding = false
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('founding_member')
      .eq('user_id', user.id)
      .maybeSingle()
    founding = Boolean(sub?.founding_member)
  }

  const display = await getPricingDisplay(region, founding)

  return (
    <>
      <PageJsonLd
        path="/pricing"
        title="Pricing — Cambridge past paper marking"
        description="MarkScheme pricing: free courses forever, plus unlimited marking for exam season."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
      />
      <PricingMarginNotesPage
        display={display}
        signedIn={Boolean(user)}
        founding={founding}
      />
    </>
  )
}
