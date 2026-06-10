import { getPageMetadata } from '@/lib/seo/page-meta'
import { HomeJsonLd } from '@/components/seo/HomeJsonLd'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingTrustStrip } from '@/components/landing/LandingTrustStrip'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingSteps } from '@/components/landing/LandingSteps'
import { LandingCoursesPromo } from '@/components/landing/LandingCoursesPromo'
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
        <LandingTrustStrip />
        <LandingFeatures />
        <LandingSteps />
        <LandingCoursesPromo />
        <LandingSubjects />
        <LandingFounder />
        <LandingComparison />
        <LandingFaq />
        <LandingFinalCta markHref={markHref} />
      </main>
    </>
  )
}
