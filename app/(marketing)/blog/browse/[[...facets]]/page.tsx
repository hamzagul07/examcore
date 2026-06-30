import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getBlogPosts, getBlogPost } from '@/lib/blog'
import { enrichPostMeta } from '@/lib/blog/meta'
import {
  BOARDS,
  BOARD_LABELS,
  matchesBoard,
  resolveBoardMeta,
  type Board,
} from '@/lib/content/taxonomy'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import {
  BoardSubjectFilter,
  type SubjectFacet,
} from '@/components/content/BoardSubjectFilter'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { getSyllabusSubjectName } from '@/lib/syllabi'
import { SITE_URL } from '@/lib/site-config'

type Props = { params: Promise<{ facets?: string[] }> }

function isBoard(v: string | undefined): v is Board {
  return v === 'cambridge' || v === 'ib'
}

function subjectLabel(board: Board, subject: string): string {
  if (board === 'cambridge') {
    const name = getSyllabusSubjectName(subject)
    return name ? `${name} · ${subject}` : subject
  }
  return subject
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function subjectsForBoard(board: Board): SubjectFacet[] {
  const counts = new Map<string, number>()
  for (const p of getBlogPosts()) {
    const m = resolveBoardMeta(p.slug, p)
    if (m.board === board && m.subject) {
      counts.set(m.subject, (counts.get(m.subject) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      label: subjectLabel(board, value),
      href: `/blog/browse/${board}/${value}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function generateStaticParams() {
  const params: { facets: string[] }[] = []
  for (const b of BOARDS) {
    params.push({ facets: [b] })
    for (const s of subjectsForBoard(b)) params.push({ facets: [b, s.value] })
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facets } = await params
  const board = facets?.[0]
  const subject = facets?.[1]
  if (!isBoard(board)) return { title: 'Browse guides by board' }
  const boardName = BOARD_LABELS[board]
  if (subject) {
    const label = subjectLabel(board, subject)
    return {
      title: `${boardName} ${label} guides`,
      description: `${boardName} ${label} revision and past-paper guides.`,
      alternates: { canonical: `${SITE_URL}/blog/browse/${board}/${subject}` },
    }
  }
  return {
    title: `${boardName} revision & past-paper guides`,
    description: `Every ${boardName} guide on MarkScheme — browse by subject.`,
    alternates: { canonical: `${SITE_URL}/blog/browse/${board}` },
  }
}

export default async function BlogBrowsePage({ params }: Props) {
  const { facets } = await params
  if (!facets || facets.length === 0) redirect('/blog')
  if (facets.length > 2) notFound() // level facets land in a later increment

  const board = facets[0]
  const subject = facets[1] ?? null
  if (!isBoard(board)) notFound()

  const boardName = BOARD_LABELS[board]
  const subjectOptions = subjectsForBoard(board)
  const subjectLabelText = subject ? subjectLabel(board, subject) : null

  const matched = getBlogPosts().filter((p) => {
    const m = resolveBoardMeta(p.slug, p)
    if (!matchesBoard(m, board)) return false
    if (subject) return m.subject === subject
    return true
  })

  if (matched.length === 0) notFound()

  const enriched = matched.map((p) => {
    const full = getBlogPost(p.slug)
    return enrichPostMeta(p, full?.content ?? '')
  })

  const title = subjectLabelText ? `${boardName} ${subjectLabelText}` : `${boardName} guides`
  const basePath = `/blog/browse/${board}${subject ? `/${subject}` : ''}`

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={basePath}
        title={`${title} — MarkScheme`}
        description={`${boardName} revision and past-paper guides on MarkScheme.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: boardName, path: `/blog/browse/${board}` },
          ...(subject
            ? [{ name: subjectLabelText as string, path: basePath }]
            : []),
        ]}
      />
      <MarketingHero
        label="Guides & blog"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: boardName, path: `/blog/browse/${board}` },
        ]}
        title={title}
        lead={`${matched.length} ${boardName} guide${
          matched.length === 1 ? '' : 's'
        } — filter by subject below.`}
      >
        <BoardSubjectFilter
          activeBoard={board}
          activeSubject={subject}
          subjectOptions={subjectOptions}
        />
      </MarketingHero>

      <MarketingSection className="!pt-8">
        <div className="grid gap-5 md:grid-cols-2">
          {enriched.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
