import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBlogPosts } from '@/lib/blog'
import { enrichPostsForIndex } from '@/lib/blog/meta'
import { paginateArchive, parseArchivePage } from '@/lib/blog/archive'
import { ArchivePagination } from '@/components/blog/ArchivePagination'
import {
  BOARD_LABELS,
  LEVEL_LABELS,
  resolveBoardMeta,
  type Board,
  type Level,
} from '@/lib/content/taxonomy'
import { getAllBlogBrowseFacets, getBoardSubjects } from '@/lib/content/blog-facets'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import {
  BoardSubjectFilter,
  type LevelFacet,
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

type Props = {
  params: Promise<{ facets?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

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

function facetOptions(board: Board, subject: string | null) {
  const entries = getBoardSubjects(board)
  const toSubjectFacet = (e: (typeof entries)[number]): SubjectFacet => ({
    value: e.value,
    label: subjectLabel(board, e.value),
    href: `/blog/browse/${board}/${e.value}`,
    count: e.count,
    core: e.core,
  })
  const subjectOptions = entries.filter((e) => !e.core).map(toSubjectFacet)
  const coreOptions = entries.filter((e) => e.core).map(toSubjectFacet)
  const active = subject ? entries.find((e) => e.value === subject) : null
  const levelOptions: LevelFacet[] = (active?.levels ?? []).map((l) => ({
    value: l.value,
    label: LEVEL_LABELS[l.value] ?? l.value,
    href: `/blog/browse/${board}/${subject}/${l.value}`,
    count: l.count,
  }))
  return { subjectOptions, coreOptions, levelOptions, knownSubject: Boolean(active) }
}

export function generateStaticParams() {
  return getAllBlogBrowseFacets().map((facets) => ({ facets }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facets } = await params
  const board = facets?.[0]
  if (!isBoard(board)) {
    return {
      title: 'Browse guides by board',
      description:
        'Browse Cambridge and IB revision guides by board, subject, and level on MarkScheme.',
    }
  }
  const boardName = BOARD_LABELS[board]
  const subject = facets?.[1]
  const level = facets?.[2] as Level | undefined
  const parts = [boardName]
  if (subject) parts.push(subjectLabel(board, subject))
  if (level) parts.push(LEVEL_LABELS[level] ?? level)
  const canonical = `${SITE_URL}/blog/browse/${facets!.join('/')}`
  return {
    title: `${parts.join(' ')} guides`,
    description: `${parts.join(' ')} revision and past-paper guides on MarkScheme.`,
    alternates: { canonical },
  }
}

export default async function BlogBrowsePage({ params, searchParams }: Props) {
  const { facets } = await params
  const sp = await searchParams
  if (!facets || facets.length === 0) notFound()
  if (facets.length > 3) notFound()

  const board = facets[0]
  const subject = facets[1] ?? null
  const level = (facets[2] as Level | undefined) ?? null
  if (!isBoard(board)) notFound()

  const { subjectOptions, coreOptions, levelOptions, knownSubject } = facetOptions(
    board,
    subject
  )
  if (subject && !knownSubject) notFound()
  if (level && !levelOptions.some((l) => l.value === level)) notFound()

  const boardName = BOARD_LABELS[board]
  const subjectText = subject ? subjectLabel(board, subject) : null
  const levelText = level ? (LEVEL_LABELS[level] ?? level) : null

  const matched = enrichPostsForIndex(
    getBlogPosts().filter((p) => {
      const m = resolveBoardMeta(p.slug, p)
      if (m.board !== board) return false
      if (subject && m.subject !== subject) return false
      if (level && m.level !== level) return false
      return true
    })
  )
  if (matched.length === 0) notFound()

  const page = parseArchivePage(sp.page)
  const archive = paginateArchive(matched, page)
  if (page > archive.totalPages) notFound()
  const enriched = archive.items

  const title = [boardName, subjectText, levelText].filter(Boolean).join(' ')
  const basePath = `/blog/browse/${facets.join('/')}`
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: boardName, path: `/blog/browse/${board}` },
    ...(subject ? [{ name: subjectText as string, path: `/blog/browse/${board}/${subject}` }] : []),
    ...(level ? [{ name: levelText as string, path: basePath }] : []),
  ]

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={basePath}
        title={`${title} guides — MarkScheme`}
        description={`${title} revision and past-paper guides on MarkScheme.`}
        breadcrumbs={breadcrumbs}
      />
      <MarketingHero
        label="Guides & blog"
        breadcrumbs={breadcrumbs.slice(0, subject ? 4 : 3)}
        title={`${title} guides`}
        lead={`${matched.length} ${title} guide${matched.length === 1 ? '' : 's'} — filter below.`}
      >
        <BoardSubjectFilter
          activeBoard={board}
          activeSubject={subject}
          activeLevel={level}
          subjectOptions={subjectOptions}
          coreOptions={coreOptions}
          levelOptions={levelOptions}
        />
      </MarketingHero>

      <MarketingSection className="!pt-8">
        <div className="grid gap-5 md:grid-cols-2">
          {enriched.map((post) => (
            <BlogPostCard key={post.slug} post={post} variant="compact" />
          ))}
        </div>

        <ArchivePagination
          basePath={basePath}
          page={archive.page}
          totalPages={archive.totalPages}
          total={archive.total}
        />

        <div className="ms-hub-card ms-hub-cta" style={{ marginTop: 40 }}>
          <p className="ms-greennote" style={{ margin: 0, flex: 1, minWidth: 240 }}>
            Guides show how {boardName} marks work — now earn them ↓
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/mark" className="ec-btn-primary ec-btn-primary--sm">
              Mark a {boardName} question — free
            </Link>
            <Link
              href={board === 'ib' ? '/ib/courses' : '/courses'}
              className="ec-btn-secondary ec-btn-secondary--sm"
            >
              {boardName} courses
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
