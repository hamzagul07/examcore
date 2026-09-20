import { SITE_URL } from '@/lib/site-config'

export type SiteAuthor = {
  id: string
  name: string
  /** Other names the person is known by (schema.org alternateName). */
  alternateName?: string[]
  givenName?: string
  familyName?: string
  role: string
  bio: string
  credentials: string[]
  /** Canonical profile page — the Person node's @id is anchored here. */
  url: string
  image?: string
}

/**
 * Default E-E-A-T author — founder voice for blog guides, and the Person that
 * Organization.founder points at. The full legal name is what search engines
 * need to connect a name query to the brand; "Hamza Gul" stays as an
 * alternateName because the About page and the blog bylines used it for a year.
 */
export const DEFAULT_BLOG_AUTHOR: SiteAuthor = {
  id: 'hamza-gul',
  name: 'Hamza Gul Hassan',
  alternateName: ['Hamza Gul'],
  givenName: 'Hamza',
  familyName: 'Gul Hassan',
  role: 'Founder & CEO',
  bio: 'Founder and CEO of MarkScheme. Started building it as a Cambridge A-Level student who wanted examiner-grade feedback on his own past papers; writes the guides from real revision sessions.',
  credentials: ['Hands-on past-paper marking workflow'],
  url: `${SITE_URL}/hamza-gul-hassan`,
  // To add a headshot: drop the file in /public and set e.g.
  // image: `${SITE_URL}/authors/hamza-gul-hassan.jpg`,
}

const AUTHORS: Record<string, SiteAuthor> = {
  'hamza-gul': DEFAULT_BLOG_AUTHOR,
  // Back-compat alias: 178 posts have `author: hassan` in frontmatter.
  hassan: DEFAULT_BLOG_AUTHOR,
}

export function getAuthor(id?: string | null): SiteAuthor {
  if (!id) return DEFAULT_BLOG_AUTHOR
  return AUTHORS[id] ?? DEFAULT_BLOG_AUTHOR
}
