import { getPageMetadata } from '@/lib/seo/page-meta'
import { HomeJsonLd } from '@/components/seo/HomeJsonLd'
import { HomeGeoIntro } from '@/components/seo/HomeGeoIntro'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingPillars } from '@/components/landing/LandingPillars'
import { LandingMarkingSection } from '@/components/landing/LandingMarkingSection'
import { LandingPlatformShowcase } from '@/components/landing/LandingPlatformShowcase'
import { LandingSubjects } from '@/components/landing/LandingSubjects'
import { LandingFounder } from '@/components/landing/LandingFounder'
import { LandingComparison } from '@/components/landing/LandingComparison'
import { LandingFaq } from '@/components/landing/LandingFaq'
import { LandingFinalCta } from '@/components/landing/LandingFinalCta'
import { LandingEditorialSpotlight } from '@/components/landing/LandingEditorialSpotlight'
import { LandingProof } from '@/components/landing/LandingProof'
import { LandingMarkPreview } from '@/components/landing/LandingMarkPreview'

export const metadata = getPageMetadata('/')

export default function Home() {
  const markHref = '/mark'

  return (
    <>
      <HomeJsonLd />
      <main>
        <LandingHero markHref={markHref} />
        <HomeGeoIntro />
        <LandingEditorialSpotlight />
        {/* Show the artefact before explaining it — a visitor deciding in
            five seconds looks rather than reads. */}
        <LandingMarkPreview markHref={markHref} />
        <LandingPillars />
        <LandingMarkingSection />
        <LandingPlatformShowcase />
        <LandingSubjects />
        {/* Renders nothing until real, approved student feedback exists. */}
        <LandingProof />
        <LandingFounder />
        <LandingComparison />
        <LandingFaq />
        <LandingFinalCta markHref={markHref} />
      </main>
    </>
  )
}
