import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { getIbSubjects } from '@/lib/ib/catalog'
import { CommunityBrowser, type BrowserSubject } from '@/components/community/CommunityBrowser'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Community — student notes & Q&A',
  description:
    'Free student-contributed notes and a public Q&A for every Cambridge A-Level and IB subject. Pick a subject to read, upvote, ask and answer — all moderated.',
  path: '/community',
})

export default function CommunityHubPage() {
  if (!isCommunityEnabled()) {
    return (
      <MarketingPageShell narrow>
        <div className="ms-pg" style={{ paddingTop: 64, textAlign: 'center' }}>
          <p className="ms-overline">Community</p>
          <h1 className="ms-h2">Coming soon</h1>
          <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
            Student notes and Q&amp;A are launching shortly.
          </p>
        </div>
      </MarketingPageShell>
    )
  }

  const cambridge: BrowserSubject[] = adaptAllCatalogSubjects(getCourseCatalog())
    .map((s) => ({ id: s.code, name: s.name, glyph: s.glyph, accent: accentCssVar(s.acc) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const ib: BrowserSubject[] = getIbSubjects()
    .map((s) => ({ id: s.slug, name: `${s.name} ${s.level}`, glyph: s.glyph, accent: s.accent }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <MarketingPageShell>
      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48, '--sc': 'var(--ec-brand)' } as CSSProperties}>
        <HubSeoIntro
          heading="The MarkScheme community"
          paragraph="Real notes and answers from students, for students — across every Cambridge A-Level and IB subject. Pick your subject below to read for free, upvote what helps, ask a question, or share your own notes. Everything is moderated and on-topic."
          links={[
            { href: '/community/guidelines', label: 'Community guidelines', variant: 'muted' },
          ]}
        />
        <CommunityBrowser cambridge={cambridge} ib={ib} />
      </div>
    </MarketingPageShell>
  )
}
