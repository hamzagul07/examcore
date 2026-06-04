import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'
import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { SubjectsGrid } from '@/components/marketing/SubjectsGrid'
import { getSubjectGuidePosts } from '@/lib/seo/subject-guides'

export const metadata = createPageMetadata({
  title: 'Cambridge subjects — A-Level & O-Level past paper marking',
  description:
    'MarkScheme supports Cambridge International past papers: 9709 Maths, 9708 Economics, 9702 Physics, 4024 O-Level Maths, and more. MCQ, B1/M1/A1, and essay marking from real mark schemes.',
  path: '/subjects',
  keywords: ['9709 past papers', '9708 economics', 'Cambridge subject codes', 'O-Level 4024'],
})

export default function SubjectsPage() {
  const guideCount = getSubjectGuidePosts().length

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/subjects"
        title="Cambridge subjects — past paper marking"
        description="MarkScheme supports Cambridge International past papers across A-Level and O-Level syllabuses."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Subjects', path: '/subjects' },
        ]}
      />
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
        {guideCount > 0 && (
          <p className="mb-8 text-center text-sm text-[var(--ec-text-secondary)]">
            Each subject includes a{' '}
            <Link href="/blog" className="ec-link font-semibold">
              free past-paper &amp; marking guide
            </Link>{' '}
            ({guideCount} syllabuses) — paper structure, mark schemes, and revision tips.
          </p>
        )}
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
            <Link
              href={buildMarketingSignUpHref()}
              className="ec-btn-secondary inline-flex min-h-[52px]"
            >
              Create free account
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
