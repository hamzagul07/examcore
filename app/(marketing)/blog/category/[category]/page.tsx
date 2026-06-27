import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { getBlogPost, getBlogPosts } from '@/lib/blog'
import {
  BLOG_CATEGORY_LABELS,
  enrichPostMeta,
  getBlogCategory,
  sortPostsForIndex,
  type BlogCategory,
} from '@/lib/blog/meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode } from '@/lib/seo/structured-data'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { SITE_URL } from '@/lib/site-config'

type Props = { params: Promise<{ category: string }> }

/** SERP-tuned intros per category — keeps each archive page distinct. */
const CATEGORY_INTRO: Record<BlogCategory, string> = {
  'subject-guide':
    'Per-syllabus past-paper guides — paper structure, how the mark scheme works, common mistakes, and a revision plan for each Cambridge and IB subject.',
  revision:
    'Revision strategy for Cambridge and IB students — past-paper schedules, how many papers to do, and how to revise with mark schemes instead of re-reading notes.',
  'mark-schemes':
    'How to read and apply Cambridge mark schemes — annotations, M/A/B marks, error carried forward, and marking your own handwriting accurately.',
  'exam-technique':
    'Exam technique that earns marks — command words, timing, examiner reports, grade boundaries, and fixing the silly mistakes that cost grades.',
  'study-skills':
    'Study skills for exam season — building notes from mark schemes, managing stress, and revision routines that actually move marks.',
  editorial:
    'Timely features for Cambridge and IB students — exam-series news, subject choice, AI and integrity rules, and what is changing this year.',
  'subject-choice':
    'Choosing your subjects — A-Level combinations, fourth subjects, switching courses, and which Cambridge and IB options open the most doors.',
}

function getCategoryKeys(): BlogCategory[] {
  return Object.keys(BLOG_CATEGORY_LABELS) as BlogCategory[]
}

export function generateStaticParams() {
  return getCategoryKeys().map((category) => ({ category }))
}

export async function generateMetadata({ params }: Props) {
  const { category } = await params
  if (!(category in BLOG_CATEGORY_LABELS)) return {}
  const label = BLOG_CATEGORY_LABELS[category as BlogCategory]
  return getPageMetadata(`/blog/category/${category}`, {
    title: `${label} guides — Cambridge & IB revision`,
    description: CATEGORY_INTRO[category as BlogCategory],
    keywords: [label, 'Cambridge revision', 'IB Diploma', 'past papers'],
  })
}

export default async function BlogCategoryPage({ params }: Props) {
  const { category } = await params
  if (!(category in BLOG_CATEGORY_LABELS)) notFound()
  const cat = category as BlogCategory
  const label = BLOG_CATEGORY_LABELS[cat]
  const path = `/blog/category/${category}`

  const posts = sortPostsForIndex(
    getBlogPosts()
      .map((p) => enrichPostMeta(p, getBlogPost(p.slug)?.content ?? ''))
      .filter((p) => getBlogCategory(p.slug, p.category) === cat)
  )

  if (posts.length === 0) notFound()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`${label} guides`}
        description={CATEGORY_INTRO[cat]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: label, path },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path,
            name: `${label} guides`,
            description: CATEGORY_INTRO[cat],
            hasPart: posts.map((p) => ({
              name: p.title,
              url: `${SITE_URL}/blog/${p.slug}`,
            })),
          }),
        ]}
      />

      <MarketingHero
        label="Blog category"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: label, path },
        ]}
        title={`${label} guides`}
        lead={CATEGORY_INTRO[cat]}
      />

      <MarketingSection className="!pt-0">
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Browse blog categories">
          {getCategoryKeys().map((key) => (
            <Link
              key={key}
              href={`/blog/category/${key}`}
              className={
                key === cat
                  ? 'ec-chip ec-chip-accent'
                  : 'ec-chip-ms ec-chip-ms--outline'
              }
              aria-current={key === cat ? 'page' : undefined}
            >
              {BLOG_CATEGORY_LABELS[key]}
            </Link>
          ))}
        </nav>

        <div className="grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>

        <p className="ms-micro mt-8 text-center">
          <Link href="/blog" className="ec-btn-underline">
            All articles
          </Link>
          {' · '}
          <Link href="/guides" className="ec-btn-underline">
            Topic guide hubs
          </Link>
        </p>
        <PageHelpStrip />
      </MarketingSection>
    </MarketingPageShell>
  )
}
