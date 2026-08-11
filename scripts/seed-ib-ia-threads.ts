/**
 * Open an IA thread for the IB subjects our students actually take.
 *
 *   pnpm community:seed-ib --dry
 *   pnpm community:seed-ib
 *   pnpm community:seed-ib --top=12
 *
 * 123 of 168 profiles are IB and 90 of those arrived in the last month, into a
 * board with eighteen posts, one of them from a real person and none from this
 * month. Everything built for results week serves Cambridge A-Level, which is
 * 41 profiles, on a moment that has passed. This is the other three quarters.
 *
 * IA choice rather than results: the May session closed on 6 July and August is
 * the start of the IB year, not the end of one. Picking a research question is
 * the thing that is actually in front of these students, it is the subject of
 * the IA-ideas guides we already rank for, and it is a question a thread can
 * genuinely help with.
 *
 * Subjects are ranked by how many of our own students take them, so the rooms
 * that open are the rooms with people in them.
 */
process.loadEnvFile?.('.env.local')

export {}

const DRY = process.argv.includes('--dry')
const TOP = Number(process.argv.find((a) => a.startsWith('--top='))?.slice(6) ?? 12)

const OFFICIAL_USERNAME = 'markscheme_answers'
const FLAIR = 'IA'

/** Hand-written, because the EE is a research essay and not an assessment task. */
const EE_THREAD = {
  slug: 'extended-essay',
  title: 'Extended Essay: what is your research question?',
  body: [
    'Post the question you are thinking of and we will tell you honestly whether it will survive 4,000 words.',
    '',
    'What usually goes wrong, in order of how often:',
    '',
    '- **The question is a topic, not a question.** "Renewable energy in Germany" is a subject heading. A question has an answer somebody could disagree with.',
    '- **Too broad for the word count.** If it would take a book, it will take a bad essay.',
    '- **No sources you can actually reach.** Especially for anything needing archives, interviews or paywalled data.',
    '- **Wrong subject registration.** A history question answered with economics tools scores badly in both.',
    '',
    'Full walkthrough: [the Extended Essay guide](/blog/ib-extended-essay-complete-guide)',
    '',
    'Post your draft question and which subject you are registering it under — the subject is usually where the problem is.',
  ].join('\n'),
}

async function main() {
  const fs = await import('fs')
  const path = await import('path')
  const { createClient } = await import('@supabase/supabase-js')
  const { getIbSubjects } = await import('../lib/ib/catalog')
  const { iaName, iaArticle, subjectBase, CORE_COMPONENTS } = await import('../lib/community/ia-names')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const blogSlugs = new Set(
    fs
      .readdirSync(path.join(process.cwd(), 'content', 'blog'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  )
  const catalog = new Map(getIbSubjects().map((s) => [s.slug, s]))

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

  // Ranked by our own students. A thread in a room nobody is in helps nobody.
  const { data: profiles } = await db.from('user_profiles').select('subjects').eq('board', 'IB')
  const demand = new Map<string, number>()
  for (const row of profiles ?? []) {
    for (const raw of (row.subjects as string[] | null) ?? []) {
      const slug = raw.replace(/^ib-/, '')
      if (!catalog.has(slug)) continue
      demand.set(slug, (demand.get(slug) ?? 0) + 1)
    }
  }
  const ranked = [...demand.entries()]
    .filter(([slug]) => !CORE_COMPONENTS.has(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP)
  const eeStudents = demand.get(EE_THREAD.slug) ?? 0

  const { data: existing } = await db
    .from('community_posts')
    .select('subject_code')
    .eq('status', 'published')
    .eq('board', 'ib')
    .eq('flair', FLAIR)
  const covered = new Set((existing ?? []).map((r) => r.subject_code as string))

  let created = 0
  let skipped = 0

  for (const [slug, users] of ranked) {
    const subject = catalog.get(slug)!
    if (covered.has(slug)) {
      console.log(`• skip (has thread)  ${slug}`)
      skipped++
      continue
    }

    const base = subjectBase(slug)
    const ia = iaName(slug)
    const guide = [`ib-${base}-ia-ideas`, `ib-${base.replace(/-a-.*/, '-a')}-ia-ideas`].find((s) =>
      blogSlugs.has(s)
    )

    const title = `${subject.name} ${subject.level}: what are you doing your ${ia} on?`
    const body = [
      `If you are picking ${iaArticle(ia)} ${ia} topic this term, post the question you are considering and we will tell you honestly whether it is workable.`,
      '',
      'Worth saying up front what usually goes wrong:',
      '',
      `- **Too broad.** A question you could write a book on is a question you cannot do well in the word count.`,
      `- **No data you can actually get.** The idea is fine, the measurements are not available, and you find out three weeks in.`,
      `- **Nothing of you in it.** The ones that read well are the ones the student actually cared about.`,
      '',
      ...(guide ? [`Ideas to start from: [${subject.name} ${ia} ideas](/blog/${guide})`, ''] : []),
      `Post your draft question — the earlier the better, because changing it in October is cheap and changing it in February is not.`,
    ].join('\n')

    if (DRY) {
      console.log(`\n• would open (${String(users).padStart(2)} students)  ${slug}\n  ${title}\n${body}\n`)
      created++
      continue
    }

    const { data: inserted, error } = await db
      .from('community_posts')
      .insert({
        author_id: authorId,
        board: 'ib',
        subject_code: slug,
        kind: 'discussion',
        flair: FLAIR,
        title,
        body_md: body,
        status: 'published',
      })
      .select('id')
      .single()
    if (error) throw error

    // The author's own upvote — the vote trigger is what computes hot_rank, and
    // without it the thread sits at the column default of 0.
    const { error: voteError } = await db
      .from('community_post_votes')
      .insert({ post_id: inserted.id, user_id: authorId, value: 1 })
    if (voteError) throw voteError

    console.log(`• opened (${String(users).padStart(2)} students)  ${slug}`)
    created++
  }

  // The Extended Essay, with wording that matches what it actually is.
  if (eeStudents > 0) {
    if (covered.has(EE_THREAD.slug)) {
      console.log(`• skip (has thread)  ${EE_THREAD.slug}`)
      skipped++
    } else if (DRY) {
      console.log(`\n• would open (${eeStudents} students)  ${EE_THREAD.slug}\n  ${EE_THREAD.title}\n${EE_THREAD.body}\n`)
      created++
    } else {
      const { data: inserted, error } = await db
        .from('community_posts')
        .insert({
          author_id: authorId,
          board: 'ib',
          subject_code: EE_THREAD.slug,
          kind: 'discussion',
          flair: FLAIR,
          title: EE_THREAD.title,
          body_md: EE_THREAD.body,
          status: 'published',
        })
        .select('id')
        .single()
      if (error) throw error
      const { error: voteError } = await db
        .from('community_post_votes')
        .insert({ post_id: inserted.id, user_id: authorId, value: 1 })
      if (voteError) throw voteError
      console.log(`• opened (${eeStudents} students)  ${EE_THREAD.slug}`)
      created++
    }
  }

  console.log(`\n${DRY ? '[dry] ' : ''}${created} opened, ${skipped} skipped.`)
  console.log('TOK is deliberately not seeded — prescribed titles change by session.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
