/**
 * Finds the page on a school's own site where its staff are listed.
 *
 * This exists to make a manual pass faster, not to replace it. It resolves which
 * of the usual staff-page URLs actually exists and hands back a link; a person
 * then opens it and reads who the head of chemistry is.
 *
 * It deliberately does **not** extract email addresses. Harvesting personal
 * addresses from websites at scale is the thing data-protection regulators
 * object to most, it is what mailing-list vendors do, and a list built that way
 * is worth less than one where somebody read the page — because reading the page
 * is how you learn the name to open the email with.
 *
 * Everything here is pure. The fetching lives in scripts/outreach.ts so the
 * rules that decide what may be requested can be tested without a network.
 */

/** Identifies the crawler to the sites it visits. */
export const RESEARCH_USER_AGENT = 'MarkSchemeOutreachResearch/1.0 (+https://markscheme.app)'

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

export type RobotsRules = {
  /** Ordered rules; longest match wins, Allow beating Disallow on a tie. */
  rules: { allow: boolean; path: string }[]
  crawlDelaySeconds: number | null
}

/**
 * Parses the subset of robots.txt that matters here.
 *
 * Group selection follows the spec: the most specific matching User-agent wins,
 * so an explicit rule for this crawler beats `*`. A malformed or missing file is
 * treated as "no rules", which is the documented default — but a file that fails
 * to *fetch* is handled by the caller, which treats that as do-not-crawl.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const ua = userAgent.toLowerCase()
  const groups: { agents: string[]; rules: RobotsRules['rules']; delay: number | null }[] = []
  let current: (typeof groups)[number] | null = null
  let lastLineWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue

    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group of rules.
      if (!current || !lastLineWasAgent) {
        current = { agents: [], rules: [], delay: null }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastLineWasAgent = true
      continue
    }

    lastLineWasAgent = false
    if (!current) continue

    if (field === 'disallow') {
      // `Disallow:` with an empty value means "nothing is disallowed".
      if (value) current.rules.push({ allow: false, path: value })
    } else if (field === 'allow') {
      if (value) current.rules.push({ allow: true, path: value })
    } else if (field === 'crawl-delay') {
      const n = Number(value)
      if (Number.isFinite(n) && n >= 0) current.delay = n
    }
  }

  // Most specific matching agent wins: an exact-ish token beats the wildcard.
  const named = groups.find((g) =>
    g.agents.some((a) => a !== '*' && (ua.includes(a) || a.includes(ua.split('/')[0])))
  )
  const wildcard = groups.find((g) => g.agents.includes('*'))
  const chosen = named ?? wildcard

  return {
    rules: chosen?.rules ?? [],
    crawlDelaySeconds: chosen?.delay ?? null,
  }
}

/** Turns a robots path pattern into a matcher, supporting `*` and `$`. */
function matches(pattern: string, path: string): boolean {
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return path.startsWith(pattern)
  }
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  const source = escaped.endsWith('\\$') ? `^${escaped.slice(0, -2)}$` : `^${escaped}`
  try {
    return new RegExp(source).test(path)
  } catch {
    // An unparseable pattern is treated as non-matching rather than as a licence
    // to crawl — the caller's default is already conservative.
    return false
  }
}

/**
 * Whether `path` may be requested.
 *
 * Longest matching rule wins; Allow beats Disallow at equal length, per the
 * robots specification. No matching rule means allowed.
 */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  let best: { allow: boolean; length: number } | null = null
  for (const rule of rules.rules) {
    if (!matches(rule.path, path)) continue
    const length = rule.path.length
    if (!best || length > best.length || (length === best.length && rule.allow)) {
      best = { allow: rule.allow, length }
    }
  }
  return best ? best.allow : true
}

// ---------------------------------------------------------------------------
// Candidate pages
// ---------------------------------------------------------------------------

/**
 * The paths a school actually uses for its staff list, most likely first.
 *
 * Ordered so the first hit is usually the right one and the rest can be skipped
 * — every path tried is another request on somebody else's server.
 */
const STAFF_PATHS = [
  '/staff',
  '/our-staff',
  '/staff-list',
  '/about-us/staff',
  '/about/staff',
  '/our-school/staff',
  '/information/staff',
  '/staff-directory',
  '/meet-the-team',
  '/contact-us',
  '/contact',
]

/**
 * Department pages, tried when a subject is known: they name the head.
 *
 * Kept to the three commonest spellings. Guessing is the fallback strategy, and
 * a long list of unlikely guesses spends the request budget before the generic
 * staff paths — which are far more likely to exist — are ever tried.
 */
const DEPARTMENT_PATH_TEMPLATES = ['/departments/{s}', '/curriculum/{s}', '/subjects/{s}']

/** `A Level Chemistry` → `chemistry`. */
function subjectSlug(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/\ba[\s-]?levels?\b|\bib\b|\bgcse\b/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function candidatePaths(subject?: string | null): string[] {
  const slug = subject ? subjectSlug(subject) : ''
  const departmental = slug
    ? DEPARTMENT_PATH_TEMPLATES.map((t) => t.replace('{s}', slug))
    : []
  // Department page first — it names the person to write to, where a staff list
  // only gives a wall of names.
  return [...departmental, ...STAFF_PATHS]
}

// ---------------------------------------------------------------------------
// Ranking what came back
// ---------------------------------------------------------------------------

export type ProbeResult = {
  url: string
  status: number
  /** Page <title>, when one was cheap to read. */
  title?: string | null
}

/**
 * Scores a page that responded, so the most useful link is offered first.
 *
 * A 200 on `/departments/chemistry` beats a 200 on `/contact-us`, and a page
 * whose title mentions the subject or the word "staff" beats one that does not —
 * plenty of schools serve a soft-404 landing page with status 200.
 */
export function scoreProbe(result: ProbeResult, subject?: string | null): number {
  if (result.status < 200 || result.status >= 300) return 0

  const path = safePath(result.url).toLowerCase()
  const title = (result.title ?? '').toLowerCase()
  const slug = subject ? subjectSlug(subject) : ''

  let score = 1
  if (slug && path.includes(slug)) score += 5
  if (slug && title.includes(slug.replace(/-/g, ' '))) score += 3
  if (/depart|curriculum|subject/.test(path)) score += 2
  if (/staff|team|faculty/.test(path)) score += 2
  if (/staff|team|faculty|depart|contact/.test(title)) score += 1
  // A generic contact page is better than nothing but is the last resort.
  if (/^\/contact/.test(path)) score -= 1
  return score
}

// ---------------------------------------------------------------------------
// Reading the site's own navigation
// ---------------------------------------------------------------------------

export type SiteLink = { url: string; text: string }

/**
 * Same-origin links from a page, with their anchor text.
 *
 * Preferred over guessing paths: one request instead of six, and it finds the
 * pages a school actually built rather than the ones we imagined. Only `href`
 * and link text are read — page bodies are never searched for addresses.
 */
export function extractLinks(html: string, baseUrl: string): SiteLink[] {
  const out: SiteLink[] = []
  const seen = new Set<string>()
  let origin: string
  try {
    origin = new URL(baseUrl).origin
  } catch {
    return out
  }

  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    let url: URL
    try {
      url = new URL(match[1], baseUrl)
    } catch {
      continue
    }
    // Offsite links are somebody else's problem, and following them would turn
    // a two-request lookup into an open-ended crawl.
    if (url.origin !== origin) continue
    url.hash = ''
    const href = url.toString()
    if (seen.has(href)) continue
    seen.add(href)

    const text = match[2]
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    out.push({ url: href, text })
  }
  return out
}

/**
 * Picks the links worth opening, best first.
 *
 * Scores anchor text and path together: a link reading "Chemistry" under
 * /curriculum/ is what we are looking for, while "Contact us" is the last
 * resort. Returns nothing rather than a bad guess when no link looks relevant.
 */
export function rankLinks(links: SiteLink[], subject?: string | null, limit = 4): SiteLink[] {
  const slug = subject ? subjectSlug(subject) : ''
  const words = slug ? slug.replace(/-/g, ' ') : ''

  const scored = links
    .map((link) => {
      const path = safePath(link.url).toLowerCase()
      const text = link.text.toLowerCase()
      let score = 0

      if (words && (text.includes(words) || path.includes(slug))) score += 6
      if (/\bdepartments?\b|\bcurriculum\b|\bsubjects?\b/.test(`${path} ${text}`)) score += 3
      if (/\bstaff\b|\bteam\b|\bfaculty\b|\bteachers?\b/.test(`${path} ${text}`)) score += 3
      if (/\bcontact\b/.test(`${path} ${text}`)) score += 1
      // Vacancies and governor pages list people but never the head of chemistry.
      if (/vacanc|recruit|governor|trustee|admission|policy|policies|news|term-dates/.test(path)) {
        score -= 4
      }
      return { link, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.link)
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/** Best candidate for a school, or null when nothing usable responded. */
export function bestCandidate(
  results: ProbeResult[],
  subject?: string | null
): ProbeResult | null {
  let best: { result: ProbeResult; score: number } | null = null
  for (const result of results) {
    const score = scoreProbe(result, subject)
    if (score <= 0) continue
    if (!best || score > best.score) best = { result, score }
  }
  return best?.result ?? null
}
