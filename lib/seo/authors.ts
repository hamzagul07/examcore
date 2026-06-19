import { SITE_URL } from '@/lib/site-config'

export type SiteAuthor = {
  id: string
  name: string
  role: string
  bio: string
  credentials: string[]
  url: string
  image?: string
}

/** Default E-E-A-T author — first-hand Cambridge A-Level experience. */
export const DEFAULT_BLOG_AUTHOR: SiteAuthor = {
  id: 'hassan',
  name: 'Hamza Gul',
  role: 'Founder & A-Level student',
  bio: 'Built MarkScheme after marking hundreds of Cambridge past papers by hand. Writes guides from real revision sessions — not generic AI filler.',
  credentials: [
    'Cambridge International A-Level student',
    'Hands-on past-paper marking workflow',
  ],
  url: `${SITE_URL}/about`,
}

const AUTHORS: Record<string, SiteAuthor> = {
  hassan: DEFAULT_BLOG_AUTHOR,
}

export function getAuthor(id?: string | null): SiteAuthor {
  if (!id) return DEFAULT_BLOG_AUTHOR
  return AUTHORS[id] ?? DEFAULT_BLOG_AUTHOR
}
