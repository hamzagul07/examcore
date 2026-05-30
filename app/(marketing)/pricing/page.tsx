import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'Pricing',
  description:
    'Free during early access. Unlimited marking across 15 Cambridge A-Level subjects — no card required.',
  path: '/pricing',
})

const INCLUDED = [
  'Unlimited marking',
  'All 15 Cambridge subjects',
  'Single questions or whole papers',
  'Syllabus mastery tracking',
  'Omni AI study companion',
  'Examiner\'s Ink on your handwriting',
  'All current features during early access',
]

export default function PricingPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        label="PRICING"
        title={
          <>
            <span className="gradient-text">Free</span>{' '}
            <span className="ec-text-gradient">during early access</span>
          </>
        }
        lead="No card required. Mark as much as you need while we learn from real students."
      />

      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-lg">
          <div className="ec-card relative overflow-hidden border-emerald-500/30 p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-[80px]" />
            <div className="relative">
              <p className="ec-label-tech mb-2">EARLY ACCESS</p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold ec-text-gradient">£0</span>
                <span className="text-[var(--ec-text-secondary)]">/ now</span>
              </div>
              <ul className="space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[var(--ec-text-primary)]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="ec-btn-primary mt-8 flex w-full min-h-[52px] justify-center"
              >
                Get started free <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl space-y-6 text-center">
          <p className="landing-lead">
            Examcore will move to a subscription model after early access.
            Students who join now will get a{' '}
            <strong className="text-[var(--ec-text-primary)]">meaningful discount</strong>{' '}
            when paid plans launch — our way of thanking founding members who
            helped shape the product.
          </p>
          <p className="text-base text-[var(--ec-text-secondary)]">
            No card required to start. We&apos;ll let you know well before
            anything changes, and you won&apos;t be charged without warning.
          </p>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
