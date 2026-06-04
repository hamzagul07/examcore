import { cookies, headers } from 'next/headers'
import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import type { FaqCategory } from '@/lib/faq-data'
import { PricingClient } from '@/components/pricing/PricingClient'
import { EnforcementNotice } from '@/components/marketing/EnforcementNotice'
import { createClient } from '@/lib/supabase-server'
import { resolveRegion, REGION_COOKIE } from '@/lib/billing/region-cookie'
import { getPricingDisplay } from '@/lib/billing/display-prices'
import { WHOLE_PAPER_QUESTION_LIMIT } from '@/lib/billing/features'
import type { SubscriptionTier } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Pricing — Cambridge past paper marking plans',
  description:
    'MarkScheme pricing for Cambridge A-Level and O-Level marking: free tier, Student, Scholar, and Mastery plans. Regional USD pricing, credits never expire, founding members 50% off.',
  path: '/pricing',
})

const PRICING_FAQ: FaqCategory[] = [
  {
    id: 'pricing-faq',
    title: 'Questions',
    items: [
      {
        q: 'What counts as one question?',
        a: `Whether you submit a single question or a whole paper, it counts as one question against your monthly allowance. Whole papers don't cost more even if they contain ${WHOLE_PAPER_QUESTION_LIMIT} sub-questions.`,
      },
      {
        q: 'I signed up during early access — what happens to my pricing?',
        a: 'You\'re a founding member. You get 50% off any paid plan, locked in forever. That discount applies even as we add features or raise prices for new users — your founding rate is permanent.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel from the billing portal and you keep full access until the end of your current period — no further charges.',
      },
      {
        q: 'What if I run out mid-month?',
        a: 'Buy a credit top-up or upgrade to a higher plan. Credits work for questions or study chat messages and are used automatically once your monthly allowance is spent.',
      },
      {
        q: 'Do credits expire?',
        a: 'No. Credits never expire — they sit in your balance until you use them.',
      },
      {
        q: 'Can I switch tiers?',
        a: 'Yes — upgrade or downgrade anytime from the billing portal. Changes are prorated by Stripe.',
      },
    ],
  },
]

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

  let currentTier: SubscriptionTier | null = null
  let founding = false
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('tier, founding_member')
      .eq('user_id', user.id)
      .maybeSingle()
    currentTier = (sub?.tier ?? 'free') as SubscriptionTier
    founding = Boolean(sub?.founding_member)
  }

  const display = await getPricingDisplay(region, founding)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/pricing"
        title="Pricing — Cambridge past paper marking"
        description="MarkScheme pricing: free tier, Student, Scholar, and Mastery plans for Cambridge A-Level and O-Level marking."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
      />
      <MarketingHero
        label="PRICING"
        title={
          <>
            Pick a plan that fits <span className="ec-text-gradient">your study</span>
          </>
        }
        lead="Cancel anytime. No card required for Free. Founding members get permanent early-access pricing."
      />

      <EnforcementNotice />

      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-6xl">
          <PricingClient
            display={display}
            signedIn={Boolean(user)}
            currentTier={currentTier}
            founding={founding}
            region={{ currency: region.currency, country: region.country, override: region.override }}
          />
        </div>
      </MarketingSection>

      <MarketingSection>
        <div className="mx-auto max-w-3xl">
          <FaqAccordion categories={PRICING_FAQ} />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
