/**
 * Asserts the SQL channel classifier against known hosts.
 *
 *   pnpm test:channels
 *
 * `classify_channel()` decides which channel every visit is credited to, and the
 * 'school' bucket is the number the teacher-outreach campaign is judged on. It
 * lives in SQL, so the offline test suite cannot reach it — this runs against
 * the real database instead.
 *
 * The regression block is not hypothetical: substring matching on
 * school/college/academy shipped once and put a competitor, a news site and a
 * toy shop into the school channel.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Case = {
  host: string | null
  utmSource?: string | null
  utmMedium?: string | null
  expect: string
}

const CASES: Case[] = [
  // Search is not a backlink.
  { host: 'www.google.com', expect: 'organic' },
  { host: 'www.bing.com', expect: 'organic' },
  { host: 'duckduckgo.com', expect: 'organic' },

  // Assistants are split out from search: the site allows their crawlers, and
  // this is how that bet gets measured.
  { host: 'chatgpt.com', expect: 'ai-assistant' },
  { host: 'www.perplexity.ai', expect: 'ai-assistant' },
  { host: 'claude.ai', expect: 'ai-assistant' },

  { host: 'www.tiktok.com', expect: 'social' },
  { host: 'www.reddit.com', expect: 'social' },
  { host: 't.co', expect: 'social' },
  { host: 'www.youtube.com', expect: 'social' },

  // Genuine education domains — a commercial site cannot obtain these.
  { host: 'maths.harrow.sch.uk', expect: 'school' },
  { host: 'chem.ox.ac.uk', expect: 'school' },
  { host: 'stanford.edu', expect: 'school' },
  { host: 'www.ntu.edu.sg', expect: 'school' },
  { host: 'lincoln.k12.or.us', expect: 'school' },
  { host: 'kings.school.nz', expect: 'school' },

  // Regressions: each of these was once classified 'school' and would have
  // inflated the campaign's headline number.
  { host: 'www.khanacademy.org', expect: 'referral' },
  { host: 'schoolsweek.co.uk', expect: 'referral' },
  { host: 'academy.substack.com', expect: 'referral' },
  { host: 'preschool-toys.com', expect: 'referral' },
  { host: 'oldschool.gg', expect: 'referral' },

  { host: 'physicsandmathstutor.com', expect: 'referral' },
  // A school on a vanity domain is only a school once it is allowlisted from
  // outreach_targets.website; until then precision wins and it reads as referral.
  { host: 'harrowschool.org.uk', expect: 'referral' },
  { host: null, expect: 'direct' },
  { host: '', expect: 'direct' },

  // An explicit tag outranks the host: outreach links are tagged at source.
  { host: 'mail.google.com', utmMedium: 'email', expect: 'email' },
  { host: null, utmSource: 'school-harrow-chemistry', utmMedium: 'email', expect: 'email' },
  { host: null, utmSource: 'school-harrow-chemistry', expect: 'school' },
]

/** Both credentials are required; without them this is a skip, not a failure. */
function hasDbCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function main() {
  // This check needs the real database, so an offline run (a CI step with no
  // secrets, a fresh clone) skips rather than failing on a missing key — a
  // red build that means 'no credentials' teaches people to ignore red builds.
  if (!hasDbCredentials()) {
    console.log('channel classifier — skipped (no database credentials)')
    return
  }

  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()

  let failed = 0

  for (const c of CASES) {
    const { data, error } = await service.rpc('classify_channel', {
      p_host: c.host,
      p_utm_source: c.utmSource ?? null,
      p_utm_medium: c.utmMedium ?? null,
    })
    if (error) throw new Error(`classify_channel failed: ${error.message}`)

    const actual = data as unknown as string
    if (actual !== c.expect) {
      failed++
      console.error(
        `  FAIL  host=${JSON.stringify(c.host)} ` +
          `utm=${c.utmSource ?? '-'}/${c.utmMedium ?? '-'}  ` +
          `expected ${c.expect}, got ${actual}`
      )
    }
  }

  if (failed) {
    console.error(`\nchannel classifier: ${failed} of ${CASES.length} case(s) failed`)
    process.exit(1)
  }
  console.log(`channel classifier — all ${CASES.length} cases passed`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
