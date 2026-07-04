/**
 * Seed OFFICIAL, clearly-labeled MarkScheme Team starter threads into the Exam Room.
 *
 * This is honest official content — a welcome + open prompts posted under ONE
 * clearly-labeled team account (username "MarkScheme_Team"). It is NOT fake
 * student activity: no student personas, no fabricated replies, no simulated
 * conversations. Real students reply on top of these prompts.
 *
 * You run this deliberately (it needs the service role key). It is idempotent —
 * re-running skips threads that already exist for the team account in each room.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/seed-community-official-threads.mjs [--dry]
 *
 *   --dry   print what would happen, write nothing.
 *
 * Edit TARGETS below to choose which subject rooms get the official threads.
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const DRY = process.argv.includes('--dry')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

// The official team identity. Username is unmistakably the platform, not a student.
const TEAM_EMAIL = process.env.COMMUNITY_TEAM_EMAIL || 'team@markscheme.app'
const TEAM_USERNAME = 'MarkScheme_Team'

// Which rooms get the official threads. board 'ib' subject = course slug.
// Trim or extend this list as you like (e.g. add the -hl rooms).
const TARGETS = [
  { board: 'ib', subject: 'economics-sl', name: 'Economics SL' },
  { board: 'ib', subject: 'chemistry-sl', name: 'Chemistry SL' },
  { board: 'ib', subject: 'physics-sl', name: 'Physics SL' },
  { board: 'ib', subject: 'biology-sl', name: 'Biology SL' },
  { board: 'ib', subject: 'psychology-sl', name: 'Psychology SL' },
  { board: 'ib', subject: 'maths-aa-sl', name: 'Maths AA SL' },
  { board: 'ib', subject: 'business-management-sl', name: 'Business Management SL' },
]

/** Official threads. {subject} is replaced with the room's display name. */
const THREADS = [
  {
    kind: 'discussion',
    title: 'Welcome to the {subject} room 👋 — how this works',
    body: [
      'This is a space for {subject} students to help each other — ask a doubt, share what worked, or post an answer for a second opinion.',
      '',
      '- **Ask anything** — a tricky topic, a past-paper question, an IA idea. No question is too small.',
      "- **Every question can also be marked.** Upload your answer and get mark-by-mark feedback, then bring the tricky bits back here to discuss.",
      "- **Be kind and specific.** Say the topic and what you've tried — you'll get better help.",
      "- **Share, don't just take.** If a resource or tip helped you, post it so the next person finds it faster.",
      '',
      'New here? Reply below and tell us what you\'re studying. 👇',
    ].join('\n'),
  },
  {
    kind: 'question',
    title: '📌 Stuck on a {subject} topic? Ask your doubts here',
    body: 'Drop your question below — the topic and where exactly you\'re stuck. Other students (and we) will help. If it\'s a past-paper question you can also get your answer marked for instant feedback, then post the parts you want to talk through.',
  },
  {
    kind: 'resource',
    title: '📚 What {subject} resource or study tip is working for you?',
    body: 'We all have one — a video that made a topic click, a way of revising that stuck, a past-paper habit that moved your grade. Share it below so the next {subject} student finds it faster.',
  },
  {
    kind: 'discussion',
    title: 'Which {subject} topic are you finding hardest right now?',
    body: 'Name the topic. If enough people are stuck on the same thing we\'ll point you to the lesson + practice that fixes it — and you might find someone here who\'s already cracked it.',
  },
]

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findTeamUserId() {
  // Look for an existing auth user with the team email (paginate).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => (u.email || '').toLowerCase() === TEAM_EMAIL.toLowerCase())
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return null
}

async function ensureTeamAccount() {
  let id = await findTeamUserId()
  if (id) {
    console.log(`• Official account exists: ${TEAM_EMAIL} (${id})`)
  } else {
    if (DRY) {
      console.log(`• [dry] would create official account ${TEAM_EMAIL} / @${TEAM_USERNAME}`)
      return null
    }
    const password = randomBytes(24).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({
      email: TEAM_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'MarkScheme Team', official: true },
    })
    if (error) throw error
    id = data.user.id
    console.log(`• Created official account ${TEAM_EMAIL} (${id})`)
  }
  if (!DRY) {
    const { error } = await admin
      .from('user_profiles')
      .upsert({ id, username: TEAM_USERNAME, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    console.log(`• Ensured profile @${TEAM_USERNAME}`)
  }
  return id
}

async function threadExists(authorId, subject, title) {
  const { data } = await admin
    .from('community_posts')
    .select('id')
    .eq('author_id', authorId)
    .eq('subject_code', subject)
    .eq('title', title)
    .maybeSingle()
  return Boolean(data)
}

async function run() {
  console.log(`\nSeeding official Exam Room threads${DRY ? ' (DRY RUN)' : ''}\n`)
  const authorId = await ensureTeamAccount()

  let created = 0
  let skipped = 0
  for (const room of TARGETS) {
    for (const t of THREADS) {
      const title = t.title.replaceAll('{subject}', room.name)
      const body = t.body.replaceAll('{subject}', room.name)
      if (authorId && (await threadExists(authorId, room.subject, title))) {
        skipped++
        continue
      }
      if (DRY) {
        console.log(`  [dry] ${room.subject}: ${title}`)
        created++
        continue
      }
      const { data, error } = await admin
        .from('community_posts')
        .insert({
          author_id: authorId,
          board: room.board,
          subject_code: room.subject,
          topic_code: null,
          lesson_slug: null,
          question_id: null,
          kind: t.kind,
          flair: null,
          title,
          body_md: body,
          attachments: [],
          status: 'published',
          moderation_reason: null,
        })
        .select('id')
        .single()
      if (error) {
        console.error(`  ✗ ${room.subject}: ${title} — ${error.message}`)
        continue
      }
      // Author auto-upvote (matches the app's createPost behaviour).
      await admin.from('community_post_votes').insert({ post_id: data.id, user_id: authorId, value: 1 })
      console.log(`  ✓ ${room.subject}: ${title}`)
      created++
    }
  }
  console.log(`\nDone. ${created} thread(s) ${DRY ? 'to create' : 'created'}, ${skipped} skipped (already present).`)
  if (!DRY) console.log('These are official team prompts. Let genuine student replies build on top — do NOT seed fake replies.')
}

run().catch((e) => {
  console.error('Failed:', e)
  process.exit(1)
})
