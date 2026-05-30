import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SubjectsGrid } from '@/components/marketing/SubjectsGrid'

export const metadata = createPageMetadata({
  title: 'Subjects',
  description:
    'Mark Cambridge A-Level past papers across 15 subjects — Maths, Sciences, Humanities, Business, and more.',
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
        lead="Fifteen subject codes, real mark schemes, adaptive marking for MCQ, point-based questions, and essays."
      />
      <MarketingSection className="!pt-0">
        <SubjectsGrid detailed />
        <div className="ec-card mt-16 p-8 text-center sm:p-12">
          <h2 className="landing-h3 mb-4 text-[var(--ec-text-primary)]">
            Pick your subject and start marking
          </h2>
          <p className="landing-lead mx-auto mb-8 max-w-lg">
            Free during early access. Upload something you already wrote and see
            examiner-style feedback in under a minute.
          </p>
          <Link href="/auth/signup" className="ec-btn-primary inline-flex min-h-[52px]">
            Get started free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
