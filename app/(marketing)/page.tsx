import { getPageMetadata } from '@/lib/seo/page-meta'
import { HomeJsonLd } from '@/components/seo/HomeJsonLd'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingPillars } from '@/components/landing/LandingPillars'
import { LandingMarkingSection } from '@/components/landing/LandingMarkingSection'
import { LandingPlatformShowcase } from '@/components/landing/LandingPlatformShowcase'
import { LandingSubjects } from '@/components/landing/LandingSubjects'
import { LandingFounder } from '@/components/landing/LandingFounder'
import { LandingComparison } from '@/components/landing/LandingComparison'
import { LandingFaq } from '@/components/landing/LandingFaq'
import { LandingFinalCta } from '@/components/landing/LandingFinalCta'

export const metadata = getPageMetadata('/')

export default function Home() {
  const markHref = '/mark'

  return (
    <>
      <HomeJsonLd />
      <main>
        <LandingHero markHref={markHref} />
        <LandingPillars />
        <LandingMarkingSection />
        <LandingPlatformShowcase />
        <LandingSubjects />
        <LandingFounder />
        <LandingComparison />
        <LandingFaq />
        <LandingFinalCta markHref={markHref} />
      </main>
    </>
  )
}
