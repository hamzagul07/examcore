import { getPageMetadata } from '@/lib/seo/page-meta'
import { HomeJsonLd } from '@/components/seo/HomeJsonLd'
import { HomeGeoIntro } from '@/components/seo/HomeGeoIntro'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingPillars } from '@/components/landing/LandingPillars'
import { LandingMarkingSection } from '@/components/landing/LandingMarkingSection'
import { LandingSubjects } from '@/components/landing/LandingSubjects'
import { LandingFounder } from '@/components/landing/LandingFounder'
import { LandingComparison } from '@/components/landing/LandingComparison'
import { LandingFaq } from '@/components/landing/LandingFaq'
import { LandingFinalCta } from '@/components/landing/LandingFinalCta'
import { LandingProof } from '@/components/landing/LandingProof'
import { LandingMoreBand } from '@/components/landing/LandingMoreBand'
import { LandingArtefactBeat } from '@/components/landing/LandingArtefactBeat'
import { InteractiveMarkDemoLazy } from '@/components/marketing/InteractiveMarkDemoLazy'

export const metadata = getPageMetadata('/')

/**
 * LAND-01: one narrative spine — hero → live artefact → how marking works →
 * subjects → proof → FAQ → CTA. Platform pillars / founder / comparison sit in More.
 */
export default function Home() {
  const markHref = '/mark'

  return (
    <>
      <HomeJsonLd />
      <main>
        <LandingHero markHref={markHref} />
        <HomeGeoIntro />
        <div className="ms-pg">
          <InteractiveMarkDemoLazy />
        </div>
        <LandingArtefactBeat />
        <LandingMarkingSection />
        <LandingSubjects />
        {/* Renders nothing until real, approved student feedback exists. */}
        <LandingProof />
        <LandingFaq />
        <LandingFinalCta markHref={markHref} />
        <LandingMoreBand>
          <LandingPillars />
          <LandingFounder />
          <LandingComparison />
        </LandingMoreBand>
      </main>
    </>
  )
}
