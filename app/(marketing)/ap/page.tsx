import Link from 'next/link'
import { FunnelLandingView } from '@/components/analytics/FunnelLandingView'
import { FunnelMarkLink } from '@/components/analytics/FunnelMarkLink'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getApCourses } from '@/lib/ap/catalog'
import { apMarkHref } from '@/lib/ap/marking'
import { AP_HUB_GUIDE_LINKS } from '@/lib/ap/seo-guides'

export const metadata = createPageMetadata({
  title: 'AP — Calculus AB & Physics 1 FRQ marking',
  description:
    'AP College Board surfaces for Calculus AB and Physics 1 — FRQ marking with earned/not-earned guidelines. Interactive 1–5 calculator coming later.',
  path: '/ap',
  keywords: ['AP Calculus AB', 'AP Physics 1', 'AP FRQ', 'AP score calculator'],
})

export default function ApHubPage() {
  const courses = getApCourses()
  return (
    <MarketingPageShell>
      <FunnelLandingView source="board_hub_ap" />
      <PageJsonLd
        path="/ap"
        title="AP College Board"
        description="AP Calculus AB and Physics 1 FRQ practise on MarkScheme."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AP', path: '/ap' },
        ]}
      />
      <MarketingHero
        label="College Board"
        title="AP"
        lead="Own lifecycle — FRQ marking now; interactive 1–5 calculator later. Not an A-Level Results Day clone."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <FunnelMarkLink
            href={apMarkHref('ap-calculus-ab')}
            source="board_hub_ap"
            board="ap"
            subject="ap-calculus-ab"
            className="ec-btn-primary inline-flex min-h-[48px] items-center"
          >
            Mark Calculus AB FRQ -&gt;
          </FunnelMarkLink>
          <Link href="/ap/calculus-ab" className="ec-btn-ghost inline-flex min-h-[48px] items-center">
            Calculus AB hub
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection className="!pt-0">
        <p className="ms-overline">Guides</p>
        <ul className="ms-board-index ms-board-index--guides">
          {AP_HUB_GUIDE_LINKS.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="ms-board-slip ms-board-slip--compact">
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{g.label}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>
      <MarketingSection>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.slug}>
              <Link href={`/ap/${c.slug}`} className="ms-board-slip">
                <span className="ms-board-slip__code">{c.contentCode}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{c.name}</span>
                  <span className="ms-board-slip__blurb">{c.blurb}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/ap/score-calculator" className="ms-board-slip">
              <span className="ms-board-slip__code">1-5</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Score calculator</span>
                <span className="ms-board-slip__blurb">
                  Indicative 1–5 projection helper — not an official College Board tool.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
