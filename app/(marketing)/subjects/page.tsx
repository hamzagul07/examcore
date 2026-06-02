import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SubjectsGrid } from '@/components/marketing/SubjectsGrid'

export const metadata = createPageMetadata({
  title: 'Cambridge subjects — A-Level & O-Level past paper marking',
  description:
    'MarkScheme supports Cambridge International past papers across Maths, Sciences, Humanities, Business, and more. Real mark schemes for MCQ, structured questions, and essays.',
  path: '/subjects',
})

export default function SubjectsPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        label="SUBJECTS"
        title={
          <>
            <span className="gradient-text">Cambridge A-Levels</span>{' '}
            <span className="ec-text-gradient">we mark</span>
          </>
        }
        lead="Cambridge A-Level and O-Level subject codes, real mark schemes, adaptive marking for MCQ, point-based questions, and essays."
      />
      <MarketingSection className="!pt-0">
        <SubjectsGrid detailed />
        <div className="ec-card mt-16 p-8 text-center sm:p-12">
          <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
            Pick your subject and start marking
          </h2>
          <p className="landing-lead mx-auto mb-8 max-w-lg">
            Start free — no card required. Founding members who complete setup
            lock in 50% off any paid plan, forever.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/mark" className="ec-btn-primary inline-flex min-h-[52px]">
              Try marking free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/auth/signup" className="ec-btn-secondary inline-flex min-h-[52px]">
              Create free account
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
