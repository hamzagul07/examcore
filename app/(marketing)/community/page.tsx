import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { getCourseCatalog } from '@/lib/courses'
import { adaptAllCatalogSubjects } from '@/lib/courses/margin-notes/adapt-subject'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { getIbSubjects } from '@/lib/ib/catalog'
import { ExamRoomHome } from '@/components/community/ExamRoomHome'
import { ExamRoomSearch } from '@/components/community/ExamRoomSearch'
import type { BrowserSubject } from '@/components/community/CommunityBrowser'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getPublicExamRoomFeed, getPersonalizedExamRoomFeed } from '@/lib/community/feed'
import { createClient } from '@/lib/supabase-server'

export const metadata = createPageMetadata({
  title: 'Exam Room — student doubts & cheat sheets',
  description:
    'Exam-anchored community for Cambridge A-Level and IB — doubts tied to syllabus points and past-paper questions, plus student cheat sheets.',
  path: '/community',
})

type PageProps = { searchParams: Promise<{ subject?: string; ask?: string; question?: string }> }

export default async function CommunityHubPage({ searchParams }: PageProps) {
  if (!isCommunityEnabled()) {
    return (
      <div className="ms-pg" style={{ paddingTop: 64, textAlign: 'center' }}>
        <p className="ms-overline">Exam Room</p>
        <h1 className="ms-h2">Coming soon</h1>
        <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
          Student doubts and cheat sheets are launching shortly.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sp = await searchParams
  const initialSubjectId = sp.subject
  const askOpen = sp.ask === '1'
  const anchorQuestionId = sp.question ?? null

  const feed = user
    ? await getPersonalizedExamRoomFeed(user.id)
    : await getPublicExamRoomFeed()

  const cambridge: BrowserSubject[] = adaptAllCatalogSubjects(getCourseCatalog())
    .map((s) => ({ id: s.code, name: s.name, glyph: s.glyph, accent: accentCssVar(s.acc) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const ib: BrowserSubject[] = getIbSubjects()
    .map((s) => ({ id: s.slug, name: `${s.name} ${s.level}`, glyph: s.glyph, accent: s.accent }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div
      className="ms-pg ms-subjects-page"
      style={{ paddingTop: 48, '--sc': 'var(--ec-brand)' } as CSSProperties}
    >
      <HubSeoIntro
        heading="Exam Room"
        paragraph="Doubts anchored to syllabus points and past-paper questions — plus cheat sheets from students revising the same papers as you. Pick your subject or explore the feed below."
        links={[{ href: '/community/guidelines', label: 'Community guidelines', variant: 'muted' }]}
      />
      <ExamRoomSearch subjectCode={initialSubjectId} />
      <ExamRoomHome
        feed={feed}
        cambridge={cambridge}
        ib={ib}
        signedIn={!!user}
        initialSubjectId={initialSubjectId}
        askOpen={askOpen}
        questionId={anchorQuestionId}
      />
    </div>
  )
}
