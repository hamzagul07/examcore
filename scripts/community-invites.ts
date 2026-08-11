/**
 * Print a ready-to-send message per live threshold thread.
 *
 *   pnpm community:invites            # every subject with a live thread
 *   pnpm community:invites 9702 9709  # just these
 *
 * Written for the way these actually get sent — one WhatsApp message to one
 * person who sat that subject. One ask, one link, and the value stated before
 * the favour, because "it will tell you how far off you were" is a reason to
 * click and "help me out" is not.
 *
 * Re-run it on 18 August once the IGCSE tables are in and those threads exist;
 * it reads whatever is live rather than a hardcoded list.
 */
process.loadEnvFile?.('.env.local')

export {}

const CYCLE_START = '2026-08-11T06:00:00.000Z'
const FLAIR = 'Grade boundaries'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { communityPostHref } = await import('../lib/community/post-url')
  const { getGradeBoundaryCalculatorPages } = await import('../lib/seo/programmatic-subjects')
  const { SITE_URL } = await import('../lib/site-config')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const only = new Set(process.argv.slice(2).filter((a) => /^[0-9]{4}$/.test(a)))
  const names = new Map(getGradeBoundaryCalculatorPages().map((s) => [s.code, s.label]))

  const { data, error } = await db
    .from('community_posts')
    .select('id, subject_code, title')
    .eq('status', 'published')
    .eq('flair', FLAIR)
    .gte('created_at', CYCLE_START)
    .order('subject_code')
  if (error) throw error

  const threads = (data ?? []).filter((t) => !only.size || only.has(t.subject_code as string))
  if (!threads.length) {
    console.log('No live threshold threads. Ingest the tables and run community:seed-threads first.')
    return
  }

  console.log(`\n${threads.length} message${threads.length === 1 ? '' : 's'} — send each to someone who sat that subject.\n`)

  for (const t of threads) {
    const code = t.subject_code as string
    const label = names.get(code) ?? ''
    const href = `${SITE_URL}${communityPostHref({
      id: t.id as string,
      subjectCode: code,
      title: t.title as string,
    })}`

    console.log('─'.repeat(72))
    console.log(`${code} ${label}`.trim())
    console.log('─'.repeat(72))
    console.log(
      [
        `You did ${code}${label ? ` ${label}` : ''} this June, right?`,
        '',
        'The June 2026 thresholds are out. I put them on my site with a thing that',
        'works out exactly how far you were off the grade above — pick your paper,',
        'type your raw mark, that is it. Takes about ten seconds.',
        '',
        href,
        '',
        'If you post yours it would genuinely help me — trying to get people talking',
        'on there and it is quiet so far.',
      ].join('\n')
    )
    console.log('')
  }

  console.log('─'.repeat(72))
  console.log(
    [
      'Before you send:',
      '  · Only to people who actually sat the subject. Real marks or nothing —',
      '    invented ones are the one thing that would sink this.',
      '  · One person, one subject, one ask. Do not send a list.',
      '  · Then answer them the same day. A first post that gets a fast reply is',
      '    the one that turns into a second post.',
    ].join('\n')
  )
  console.log('')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
