import assert from 'node:assert/strict'
import {
  RESEARCH_USER_AGENT,
  bestCandidate,
  candidatePaths,
  extractLinks,
  isAllowed,
  parseRobots,
  rankLinks,
  scoreProbe,
} from '@/lib/outreach/contact-research'

const UA = RESEARCH_USER_AGENT

// --- robots.txt: the part that decides what we are allowed to request ----------

const basic = parseRobots(
  `User-agent: *
Disallow: /private
Disallow: /admin/
Allow: /private/public-bit
Crawl-delay: 2`,
  UA
)

assert.equal(isAllowed(basic, '/staff'), true, 'unlisted paths are allowed')
assert.equal(isAllowed(basic, '/private'), false)
assert.equal(isAllowed(basic, '/private/thing'), false, 'prefix match')
assert.equal(
  isAllowed(basic, '/private/public-bit'),
  true,
  'the longer Allow wins over the shorter Disallow'
)
assert.equal(basic.crawlDelaySeconds, 2, 'crawl-delay is honoured, not ignored')

// `Disallow:` with no value means nothing is disallowed — the opposite of
// `Disallow: /`, and getting these two backwards would either crawl a site that
// forbade it or skip every site that allowed it.
assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:', UA), '/anything'), true)
assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /', UA), '/anything'), false)

// An empty or comment-only file means no restrictions.
assert.equal(isAllowed(parseRobots('', UA), '/staff'), true)
assert.equal(isAllowed(parseRobots('# nothing here', UA), '/staff'), true)

// --- group selection ------------------------------------------------------------

// A rule naming this crawler beats the wildcard, even when the wildcard is
// permissive — that is the site addressing us specifically.
const named = parseRobots(
  `User-agent: *
Disallow:

User-agent: MarkSchemeOutreachResearch
Disallow: /`,
  UA
)
assert.equal(isAllowed(named, '/staff'), false, 'a rule aimed at us wins')

// A group aimed at some other crawler must not be applied to us.
const otherBot = parseRobots(
  `User-agent: SomeOtherBot
Disallow: /

User-agent: *
Disallow: /admin`,
  UA
)
assert.equal(isAllowed(otherBot, '/staff'), true, "another bot's ban is not ours")
assert.equal(isAllowed(otherBot, '/admin'), false, 'but the wildcard group still applies')

// Consecutive User-agent lines share one group of rules.
const shared = parseRobots(
  `User-agent: BotA
User-agent: *
Disallow: /nope`,
  UA
)
assert.equal(isAllowed(shared, '/nope'), false)

// --- wildcards and end-of-path anchors -------------------------------------------

const patterns = parseRobots(
  `User-agent: *
Disallow: /*.pdf$
Disallow: /search?*`,
  UA
)
assert.equal(isAllowed(patterns, '/policies/report.pdf'), false)
assert.equal(isAllowed(patterns, '/policies/report.pdf.html'), true, '$ anchors the end')
assert.equal(isAllowed(patterns, '/search?q=x'), false)

// --- candidate pages ---------------------------------------------------------------

const chemistry = candidatePaths('Chemistry')
assert.ok(
  chemistry[0].includes('chemistry'),
  'the department page is tried first — it names the person to write to'
)
assert.ok(chemistry.includes('/staff'), 'the generic staff list is still tried')

// Exam-board noise in the subject must not end up in the URL.
assert.ok(
  candidatePaths('A Level Chemistry')[0].includes('/chemistry'),
  '"A Level" is not part of a department slug'
)
assert.ok(candidatePaths('IB Biology')[0].includes('/biology'))

// With no subject, only the generic paths are tried.
const noSubject = candidatePaths(null)
assert.ok(!noSubject.some((p) => p.includes('{s}')), 'no unfilled templates escape')
assert.equal(noSubject[0], '/staff')

// --- ranking what came back ----------------------------------------------------------

// Plenty of schools serve a soft-404 landing page with status 200, so a hit is
// scored on what it looks like rather than trusted because it responded.
assert.equal(
  scoreProbe({ url: 'https://s.sch.uk/staff', status: 404 }, 'Chemistry'),
  0,
  'a 404 is not a candidate'
)
assert.equal(scoreProbe({ url: 'https://s.sch.uk/staff', status: 500 }, null), 0)

const dept = scoreProbe(
  { url: 'https://s.sch.uk/departments/chemistry', status: 200, title: 'Chemistry Department' },
  'Chemistry'
)
const staff = scoreProbe({ url: 'https://s.sch.uk/staff', status: 200, title: 'Our Staff' }, 'Chemistry')
const contact = scoreProbe({ url: 'https://s.sch.uk/contact', status: 200, title: 'Contact' }, 'Chemistry')

assert.ok(dept > staff, 'the department page beats a wall of names')
assert.ok(staff > contact, 'a staff list beats a generic contact form')

assert.equal(
  bestCandidate(
    [
      { url: 'https://s.sch.uk/contact', status: 200, title: 'Contact' },
      { url: 'https://s.sch.uk/departments/chemistry', status: 200, title: 'Chemistry' },
      { url: 'https://s.sch.uk/staff', status: 404 },
    ],
    'Chemistry'
  )?.url,
  'https://s.sch.uk/departments/chemistry'
)

assert.equal(
  bestCandidate([{ url: 'https://s.sch.uk/staff', status: 404 }], 'Chemistry'),
  null,
  'nothing usable means null, not a guess'
)
assert.equal(bestCandidate([], 'Chemistry'), null)

// --- reading the site's own navigation ------------------------------------------

const HTML = `
  <nav>
    <a href="/curriculum/chemistry">Chemistry</a>
    <a href="/staff">Our Staff</a>
    <a href="/vacancies">Vacancies</a>
    <a href="/news/autumn-term">Autumn news</a>
    <a href="https://twitter.com/school">Twitter</a>
    <a href="/contact-us">Contact us</a>
    <a href="/staff#top">Our Staff</a>
    <a href="mailto:head@school.sch.uk">Email the head</a>
  </nav>`

const links = extractLinks(HTML, 'https://school.sch.uk/')

// Offsite links would turn a two-request lookup into an open-ended crawl.
assert.ok(
  !links.some((l) => l.url.includes('twitter.com')),
  'offsite links are not followed'
)
assert.ok(
  !links.some((l) => l.url.startsWith('mailto:')),
  'mailto links are not collected — addresses are for a human to read'
)
// `/staff` and `/staff#top` are one page.
assert.equal(links.filter((l) => l.url === 'https://school.sch.uk/staff').length, 1)
assert.equal(
  links.find((l) => l.url.endsWith('/curriculum/chemistry'))?.text,
  'Chemistry',
  'anchor text is kept, since it is often the only clue'
)

const ranked = rankLinks(links, 'Chemistry')
assert.equal(
  ranked[0].url,
  'https://school.sch.uk/curriculum/chemistry',
  'the subject page ranks first — it names the person to write to'
)
assert.ok(
  ranked.some((l) => l.url.endsWith('/staff')),
  'the staff list is still offered'
)
// Vacancies and news list people but never the head of chemistry.
assert.ok(!ranked.some((l) => l.url.includes('vacancies')), 'vacancies are penalised out')
assert.ok(!ranked.some((l) => l.url.includes('/news/')), 'news is penalised out')

// Nothing relevant means nothing offered, rather than a bad guess.
assert.deepEqual(
  rankLinks(extractLinks('<a href="/cookies">Cookies</a>', 'https://s.sch.uk/'), 'Chemistry'),
  []
)
assert.deepEqual(extractLinks('not html at all', 'https://s.sch.uk/'), [])
assert.deepEqual(extractLinks('<a href="/x">y</a>', 'not a url'), [])

console.log('outreach/contact-research.test.ts — all assertions passed')
