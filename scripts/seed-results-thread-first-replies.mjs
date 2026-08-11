/**
 * Post ONE official first reply on each live results-week threshold thread.
 *
 * A thread with zero replies converts nobody: the reader has no idea what a
 * useful answer looks like and nobody wants to go first. This fills that slot
 * honestly — a worked example under the clearly-badged platform account, with
 * the arithmetic generated from the verified threshold tables in
 * content/data/grade-boundaries so the numbers cannot drift from the source.
 *
 * This is NOT fake student activity. No student personas, no invented raw
 * marks attributed to people, no simulated conversation. One official reply
 * that models the format; real students reply on top of it.
 *
 * Idempotent: a thread that already has a comment from the official account is
 * skipped, so re-running is safe.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/seed-results-thread-first-replies.mjs [--dry]
 *
 *   --dry   print the exact replies and write nothing.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DRY = process.argv.includes('--dry')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

/** The badged platform account these threads were posted under. */
const OFFICIAL_USERNAME = 'markscheme_answers'

/** Threads created on or after A-Level results — this series, not the last one. */
const CYCLE_START = '2026-08-11T06:00:00.000Z'
/**
 * Which threads get a first reply, and what kind.
 *
 * A threshold worked example is the right opener on "post your components" and
 * the wrong one on "is a remark worth it?" — that thread asks a different
 * question, and answering it with arithmetic would read as a bot pasting the
 * same block everywhere. Boundaries threads get the generated example; the
 * remark thread gets the hand-written one below.
 */
const REPLY_FLAIRS = ['Grade boundaries', 'Results day']
const SERIES = 'June 2026'

/**
 * Hand-written, not generated. Every date and rule here comes from our own EAR
 * guide, which is sourced to Cambridge's help article — a first reply that
 * invents a deadline would do real damage on a thread people are using to
 * decide whether to spend money.
 *
 * Matched on title rather than flair because "Results day" is a broad flair and
 * this text only answers the remark question.
 */
const REMARK_REPLY = {
  match: /remark/i,
  body: [
    '**The dates decide this more than the arithmetic does.**',
    '',
    '- The final EAR deadline for the June 2026 series is **20 September 2026**.',
    '- Your centre\'s own deadline is usually **earlier** — often mid-August to early September.',
    '- You cannot apply yourself. Your exams officer or centre submits it, so the first move is talking to them, not deciding alone.',
    '',
    'Two different services, and people often buy the wrong one:',
    '',
    '- A **clerical re-check** verifies totals and transcription. This is the one to ask for if your component marks do not add up to your reported total.',
    '- A **review of marking** has an examiner re-read the script against the scheme. This is the one for "I think this essay was marked harshly" — and it is the one where your mark can move **down**.',
    '',
    'Cambridge aims to respond within 30 days, and August to September is the queue.',
    '',
    'Full detail, including who submits and how fees usually work: [the EAR guide](/blog/cambridge-enquiry-about-results-ear-guide-2026).',
    '',
    'If you post your component, your raw mark and the published threshold, we can at least tell you the exact size of the gap you would be paying to close.',
  ].join('\n'),
}

const DATA_DIR = path.join(process.cwd(), 'content', 'data', 'grade-boundaries')

function loadSession(code) {
  const file = path.join(DATA_DIR, `${code}.json`)
  if (!fs.existsSync(file)) return null
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return data.sessions?.find((s) => String(s.session).trim().toLowerCase() === SERIES.toLowerCase()) ?? null
  } catch {
    return null
  }
}

/**
 * The most load-bearing component we can show: the biggest paper carries the
 * most marks, so its threshold is the one worth reasoning about. Ties break on
 * the lowest component code for a stable, re-runnable choice.
 */
function pickComponent(session) {
  const usable = (session.components ?? []).filter(
    (c) => Number.isFinite(c.max) && Number.isFinite(c.thresholds?.A) && Number.isFinite(c.thresholds?.B)
  )
  if (!usable.length) return null
  return [...usable].sort((a, b) => b.max - a.max || String(a.component).localeCompare(String(b.component)))[0]
}

function buildReply(code, session) {
  const c = pickComponent(session)
  if (!c) return null

  const a = c.thresholds.A
  const b = c.thresholds.B
  // Sit the example just under the A so the gap is worth talking about, but
  // never so low that it lands on or under the B and the sentence stops being
  // true. Some components have a very tight A/B band.
  const under = a - b > 2 ? 2 : 1
  const raw = a - under
  const clearOfB = raw - b

  const lines = [
    `**A worked example, so the format is clear.**`,
    ``,
    `${c.paper} (component ${c.component}, out of ${c.max}) — A at **${a}**, B at **${b}**.`,
    ``,
    `A raw **${raw}** is ${under} mark${under === 1 ? '' : 's'} under the A line and ${clearOfB} clear of the B.`,
    ``,
    `Worth being straight about one thing: these are **component** thresholds. Your overall ${code} grade comes from your total across all your components, not from any single paper — so one paper under the A line does not on its own mean you missed the A.`,
    ``,
    `Post your component (e.g. ${c.component}) and your raw mark and we will work out your gap both ways.`,
  ]
  return lines.join('\n')
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: profile, error: profileError } = await db
    .from('user_profiles')
    .select('id')
    .eq('username', OFFICIAL_USERNAME)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) {
    console.error(`No account @${OFFICIAL_USERNAME}. Nothing to post as.`)
    process.exit(1)
  }
  const authorId = profile.id

  const { data: threads, error: threadError } = await db
    .from('community_posts')
    .select('id, subject_code, title, flair, is_locked')
    .eq('status', 'published')
    .in('flair', REPLY_FLAIRS)
    .gte('created_at', CYCLE_START)
    .order('created_at', { ascending: true })
  if (threadError) throw threadError

  if (!threads?.length) {
    console.log('No current-cycle results threads found.')
    return
  }

  let posted = 0
  let skipped = 0

  for (const thread of threads) {
    const label = `${thread.subject_code} · ${thread.title.slice(0, 52)}`

    if (thread.is_locked) {
      console.log(`• skip (locked)      ${label}`)
      skipped++
      continue
    }

    const { count, error: countError } = await db
      .from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', thread.id)
      .eq('author_id', authorId)
    if (countError) throw countError
    if (count > 0) {
      console.log(`• skip (has reply)   ${label}`)
      skipped++
      continue
    }

    let body = null
    if (thread.flair === 'Grade boundaries') {
      const session = loadSession(thread.subject_code)
      if (!session) {
        console.log(`• skip (no ${SERIES} data) ${label}`)
        skipped++
        continue
      }
      body = buildReply(thread.subject_code, session)
    } else if (REMARK_REPLY.match.test(thread.title)) {
      body = REMARK_REPLY.body
    }

    if (!body) {
      console.log(`• skip (nothing to say) ${label}`)
      skipped++
      continue
    }

    if (DRY) {
      console.log(`\n• would reply to     ${label}\n${body}\n`)
      posted++
      continue
    }

    const { data: inserted, error: insertError } = await db
      .from('community_comments')
      .insert({
        post_id: thread.id,
        parent_id: null,
        author_id: authorId,
        body_md: body,
        depth: 0,
        status: 'published',
      })
      .select('id')
      .single()
    if (insertError) throw insertError

    // Matches lib/community/comments.ts: the author's own upvote. Triggers keep
    // comment_count and the score in sync, so nothing else needs writing.
    const { error: voteError } = await db
      .from('community_comment_votes')
      .insert({ comment_id: inserted.id, user_id: authorId, value: 1 })
    if (voteError) throw voteError

    console.log(`• replied            ${label}`)
    posted++
  }

  console.log(`\n${DRY ? '[dry] ' : ''}${posted} replied, ${skipped} skipped.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
