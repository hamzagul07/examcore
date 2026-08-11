/**
 * Open a June 2026 boundaries thread for every syllabus that has published
 * thresholds and does not have one yet.
 *
 *   pnpm community:seed-threads --dry     # print what it would post
 *   pnpm community:seed-threads           # post it
 *
 * Written to be re-run. The A-Level tables landed on 11 August and only five
 * subjects got a thread by hand; IGCSE and O-Level publish on 18 August with
 * none at all. Rather than hand-writing thirty posts across two dates, this
 * reads content/data/grade-boundaries and opens whatever is missing — so the
 * 18 August run is: ingest the tables, run this, run the first-replies script.
 *
 * Numbers come from the verified threshold files, never from prose, so a thread
 * cannot quote a figure the source does not contain. Posted under the badged
 * official account: it is the platform opening a thread, and it says so.
 */
process.loadEnvFile?.('.env.local')

export {}

const DRY = process.argv.includes('--dry')

/** A-Level results morning — threads dated before this belong to a past series. */
const CYCLE_START = '2026-08-11T06:00:00.000Z'
const SERIES = 'June 2026'
const OFFICIAL_USERNAME = 'markscheme_answers'
const FLAIR = 'Grade boundaries'

type Component = {
  component: string
  paper: string
  max: number
  thresholds: Record<string, number>
}

async function main() {
  const fs = await import('fs')
  const path = await import('path')
  const { createClient } = await import('@supabase/supabase-js')
  const { getGradeBoundaryCalculatorPages } = await import('../lib/seo/programmatic-subjects')
  const { getBlogPosts } = await import('../lib/blog')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const dataDir = path.join(process.cwd(), 'content', 'data', 'grade-boundaries')
  const names = new Map(getGradeBoundaryCalculatorPages().map((s) => [s.code, s.label]))
  const slugs = getBlogPosts().map((p) => p.slug)

  const { data: profile } = await db
    .from('user_profiles')
    .select('id')
    .eq('username', OFFICIAL_USERNAME)
    .maybeSingle()
  if (!profile) {
    console.error(`No account @${OFFICIAL_USERNAME} to post as.`)
    process.exit(1)
  }
  const authorId = profile.id as string

  // One query rather than one per subject: which syllabuses already have a
  // thread for this cycle.
  const { data: existing } = await db
    .from('community_posts')
    .select('subject_code')
    .eq('status', 'published')
    .eq('flair', FLAIR)
    .gte('created_at', CYCLE_START)
  const covered = new Set((existing ?? []).map((r) => r.subject_code as string))

  let created = 0
  let skipped = 0

  for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
    const code = file.replace('.json', '')
    const label = names.get(code)

    if (covered.has(code)) {
      console.log(`• skip (has thread)   ${code}`)
      skipped++
      continue
    }
    if (!label) {
      console.log(`• skip (no subject name)${code}`)
      skipped++
      continue
    }

    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
    const session = (parsed.sessions ?? []).find(
      (s: { session: string }) => String(s.session).trim().toLowerCase() === SERIES.toLowerCase()
    )
    if (!session) {
      console.log(`• skip (no ${SERIES})  ${code}`)
      skipped++
      continue
    }

    const usable: Component[] = (session.components ?? []).filter(
      (c: Component) => Number.isFinite(c.max) && Number.isFinite(c.thresholds?.A)
    )
    if (!usable.length) {
      console.log(`• skip (no A grades)  ${code}`)
      skipped++
      continue
    }

    // One component per paper, largest first: four lines that cover the papers
    // most candidates sat, rather than four variants of Paper 1.
    const byPaper = new Map<string, Component>()
    for (const c of [...usable].sort((a, b) => a.component.localeCompare(b.component))) {
      if (!byPaper.has(c.paper)) byPaper.set(c.paper, c)
    }
    const shown = [...byPaper.values()].sort((a, b) => b.max - a.max).slice(0, 4)

    const slug = slugs.find((s) => s.includes(`-${code}-`) && s.includes('grade-boundaries'))
    const lines = [
      `Published figures for a few ${code} components:`,
      '',
      ...shown.map(
        (c) => `- **${c.paper} (${c.component})** — A at **${c.thresholds.A}/${c.max}**`
      ),
      '',
      ...(slug ? [`Full table: [${code} grade boundaries](/blog/${slug})`, ''] : []),
      'Post your components and raw marks and we will work out the gap to the grade above and below.',
    ]
    const bodyMd = lines.join('\n')
    const title = `${code} ${label}: ${SERIES} thresholds are out — post your components`

    if (DRY) {
      console.log(`\n• would open          ${code} ${label}\n  ${title}\n${bodyMd}\n`)
      created++
      continue
    }

    const { data: inserted, error } = await db
      .from('community_posts')
      .insert({
        author_id: authorId,
        board: 'cambridge',
        subject_code: code,
        kind: 'discussion',
        flair: FLAIR,
        title,
        body_md: bodyMd,
        status: 'published',
      })
      .select('id')
      .single()
    if (error) throw error

    // The author's own upvote, exactly as createPost does it. Without this the
    // vote trigger never fires and hot_rank keeps its default of 0, which sorts
    // the thread to the bottom of the hot feed — invisible the moment the room
    // holds more posts than the feed's fetch window.
    const { error: voteError } = await db
      .from('community_post_votes')
      .insert({ post_id: inserted.id, user_id: authorId, value: 1 })
    if (voteError) throw voteError

    console.log(`• opened              ${code} ${label}`)
    created++
  }

  console.log(`\n${DRY ? '[dry] ' : ''}${created} opened, ${skipped} skipped.`)
  if (created && !DRY) {
    console.log('Next: node scripts/seed-results-thread-first-replies.mjs')
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
