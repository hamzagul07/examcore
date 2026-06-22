import { createServiceClient } from '@/lib/supabase-server'
import type { Board, PostKind } from '@/lib/community/posts'

const SEED_MARKER = 'b1000001-0000-4000-8000-000000000001'

type SeedUser = { id: string; email: string; username: string; name: string }

const USERS: SeedUser[] = [
  { id: 'a1000001-0000-4000-8000-000000000001', email: 'examroom-seed@examcore.internal', username: 'examroom', name: 'Exam Room' },
  { id: 'a1000002-0000-4000-8000-000000000002', email: 'studyhelper-seed@examcore.internal', username: 'studyhelper', name: 'Study Helper' },
  { id: 'a1000003-0000-4000-8000-000000000003', email: 'pastpaper-seed@examcore.internal', username: 'pastpaper_pro', name: 'Past Paper Pro' },
]

type SeedPost = {
  id: string
  author: string
  board: Board
  subjectCode: string
  kind: PostKind
  flair: string
  title: string
  bodyMd: string
  score: number
  comments: number
  pinned?: boolean
  hoursAgo: number
}

const POSTS: SeedPost[] = [
  { id: 'b1000001-0000-4000-8000-000000000001', author: 'examroom', board: 'cambridge', subjectCode: '9702', kind: 'discussion', flair: 'Grade boundaries', title: 'May/June 2024 Physics A-Level grade boundaries — what are you expecting?', bodyMd: 'Saw a few people online saying P4 was brutal this year. For those who sat **9702** in MJ24 — what raw marks are you hoping for a B vs an A?\n\nDrop your paper + rough score if you\'re comfortable.', score: 27, comments: 3, pinned: true, hoursAgo: 2 },
  { id: 'b1000002-0000-4000-8000-000000000002', author: 'studyhelper', board: 'cambridge', subjectCode: '9709', kind: 'discussion', flair: 'Papers', title: 'Pure 3 vs Mechanics — which paper did you find harder this series?', bodyMd: 'Genuinely split in my year group. P3 integration felt longer than usual but M1 vectors tripped people up on Q7.', score: 19, comments: 2, hoursAgo: 5 },
  { id: 'b1000003-0000-4000-8000-000000000003', author: 'examroom', board: 'cambridge', subjectCode: '9618', kind: 'discussion', flair: 'NEA', title: 'A-Level Computer Science NEA — project ideas that actually score well', bodyMd: 'Looking for **9618** NEA ideas that aren\'t "another booking system". What worked for you?', score: 14, comments: 2, hoursAgo: 8 },
  { id: 'b1000004-0000-4000-8000-000000000004', author: 'pastpaper_pro', board: 'cambridge', subjectCode: '9700', kind: 'discussion', flair: 'Revision', title: 'Bio paper 2 data analysis — tips for the maths-heavy questions?', bodyMd: 'Paper 2 punishes students who memorise facts but freeze on graphs and chi-squared.', score: 12, comments: 2, hoursAgo: 12 },
  { id: 'b1000005-0000-4000-8000-000000000005', author: 'examroom', board: 'ib', subjectCode: 'physics-hl', kind: 'discussion', flair: 'Grade boundaries', title: 'IB Physics HL May 2024 boundaries — 6 or 7 cutoffs?', bodyMd: 'HL Paper 3 options felt time-pressured. Which paper hurt most for **Physics HL**?', score: 20, comments: 3, pinned: true, hoursAgo: 3 },
  { id: 'b1000006-0000-4000-8000-000000000006', author: 'studyhelper', board: 'ib', subjectCode: 'math-aa-hl', kind: 'discussion', flair: 'IA', title: 'Math AA HL IA topics that markers don\'t get bored marking', bodyMd: 'Trying to pick an **Math AA HL** IA topic with enough maths depth without copying Reddit.', score: 17, comments: 2, hoursAgo: 6 },
  { id: 'b1000007-0000-4000-8000-000000000007', author: 'pastpaper_pro', board: 'ib', subjectCode: 'economics-hl', kind: 'discussion', flair: 'Exams', title: 'IB Economics HL Paper 3 — macro predictions for 2025', bodyMd: 'Policy mix, exchange rates, and development always show up in **Economics HL**.', score: 10, comments: 2, hoursAgo: 10 },
  { id: 'b1000008-0000-4000-8000-000000000008', author: 'examroom', board: 'ib', subjectCode: 'chemistry-hl', kind: 'discussion', flair: 'Options', title: 'Is IB Chemistry HL Option B (Biochemistry) worth doing?', bodyMd: 'Our school defaults to Option B. Which **Chemistry HL** option did you pick?', score: 9, comments: 2, hoursAgo: 14 },
  { id: 'b1000009-0000-4000-8000-000000000009', author: 'studyhelper', board: 'cambridge', subjectCode: '9702', kind: 'question', flair: 'Mechanics', title: 'Why is centripetal force not a real force?', bodyMd: 'Examiners still write $F = mv^2/r$ on mark schemes. How do you explain this in **9702** P4?', score: 14, comments: 2, hoursAgo: 7 },
  { id: 'b1000010-0000-4000-8000-000000000010', author: 'pastpaper_pro', board: 'ib', subjectCode: 'math-aa-hl', kind: 'question', flair: 'IA', title: 'How do you prove series convergence rigorously for Math AA HL IA?', bodyMd: 'My teacher wants epsilon-style reasoning. What level of proof is enough?', score: 10, comments: 2, hoursAgo: 9 },
  { id: 'b1000011-0000-4000-8000-000000000011', author: 'examroom', board: 'cambridge', subjectCode: '9709', kind: 'resource', flair: 'Cheat sheet', title: 'My P3 formula sheet — everything I actually use in exams', bodyMd: 'Trig identities, integration tricks, and complex-number shortcuts for **9709** Pure 3.', score: 21, comments: 1, hoursAgo: 4 },
  { id: 'b1000012-0000-4000-8000-000000000012', author: 'studyhelper', board: 'ib', subjectCode: 'biology-sl', kind: 'resource', flair: 'Notes', title: 'Topic 6 Human physiology — one-page summary (SL)', bodyMd: 'Condensed **Biology SL** Topic 6 notes for last-week revision.', score: 8, comments: 1, hoursAgo: 16 },
]

const COMMENTS: { id: string; postId: string; author: string; bodyMd: string; score: number; hoursAgo: number }[] = [
  { id: 'c1000001-0000-4000-8000-000000000001', postId: 'b1000001-0000-4000-8000-000000000001', author: 'studyhelper', bodyMd: 'P4 felt harder than 2023 — lost marks on uncertainty. Hoping ~55/80 for an A.', score: 8, hoursAgo: 1 },
  { id: 'c1000002-0000-4000-8000-000000000002', postId: 'b1000001-0000-4000-8000-000000000001', author: 'pastpaper_pro', bodyMd: 'Boundaries move when everyone struggles — wait for official CAIE tables.', score: 11, hoursAgo: 1 },
  { id: 'c1000003-0000-4000-8000-000000000003', postId: 'b1000001-0000-4000-8000-000000000001', author: 'examroom', bodyMd: 'Share paper codes (42 vs 52) when you comment so others can compare.', score: 5, hoursAgo: 1 },
  { id: 'c1000019-0000-4000-8000-000000000019', postId: 'b1000009-0000-4000-8000-000000000009', author: 'examroom', bodyMd: 'Centripetal acceleration comes from a **real** force. $mv^2/r$ is the magnitude of that resultant — not a separate force on FBDs.', score: 11, hoursAgo: 6 },
  { id: 'c1000020-0000-4000-8000-000000000020', postId: 'b1000009-0000-4000-8000-000000000009', author: 'pastpaper_pro', bodyMd: 'Draw FBD with only real forces, then write resultant radial force = $mv^2/r$ for method marks.', score: 9, hoursAgo: 5 },
  { id: 'c1000021-0000-4000-8000-000000000021', postId: 'b1000010-0000-4000-8000-000000000010', author: 'examroom', bodyMd: 'Comparison test is usually enough for IA. Full epsilon proofs are overkill unless your topic demands it.', score: 6, hoursAgo: 8 },
  { id: 'c1000022-0000-4000-8000-000000000022', postId: 'b1000010-0000-4000-8000-000000000010', author: 'studyhelper', bodyMd: 'Plot partial sums with technology, then prove convergence with ratio or integral test.', score: 5, hoursAgo: 7 },
  { id: 'c1000004-0000-4000-8000-000000000004', postId: 'b1000002-0000-4000-8000-000000000002', author: 'pastpaper_pro', bodyMd: 'M1 for me — vectors on the pulley question. Pure 3 was long but familiar.', score: 6, hoursAgo: 4 },
  { id: 'c1000005-0000-4000-8000-000000000005', postId: 'b1000002-0000-4000-8000-000000000002', author: 'examroom', bodyMd: 'Opposite here — P3 integration by parts stacked up.', score: 4, hoursAgo: 3 },
  { id: 'c1000006-0000-4000-8000-000000000006', postId: 'b1000003-0000-4000-8000-000000000003', author: 'studyhelper', bodyMd: 'Weather-station logger with real sensors — boring but full marks on testing.', score: 7, hoursAgo: 7 },
  { id: 'c1000013-0000-4000-8000-000000000013', postId: 'b1000006-0000-4000-8000-000000000006', author: 'pastpaper_pro', bodyMd: 'Modelling epidemics with differential equations scored well for IA.', score: 6, hoursAgo: 5 },
  { id: 'c1000023-0000-4000-8000-000000000023', postId: 'b1000011-0000-4000-8000-000000000011', author: 'studyhelper', bodyMd: 'Yes please upload the PDF — would save rebuilding mine before mocks.', score: 4, hoursAgo: 3 },
  { id: 'c1000010-0000-4000-8000-000000000010', postId: 'b1000005-0000-4000-8000-000000000005', author: 'studyhelper', bodyMd: 'Paper 2 EM was the killer for us. Heard 7 boundary might be low 70s%.', score: 5, hoursAgo: 2 },
  { id: 'c1000011-0000-4000-8000-000000000011', postId: 'b1000005-0000-4000-8000-000000000005', author: 'pastpaper_pro', bodyMd: 'Know your Hertzsprung-Russell diagram cold for astrophysics options.', score: 8, hoursAgo: 2 },
]

function userId(username: string) {
  return USERS.find((u) => u.username === username)!.id
}

function hoursAgoIso(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

/** Idempotent starter content — runs once when the marker post is missing. */
export async function ensureCommunitySeed(): Promise<void> {
  const admin = createServiceClient()
  const { data: marker } = await admin.from('community_posts').select('id').eq('id', SEED_MARKER).maybeSingle()
  if (marker) return

  for (const u of USERS) {
    const { data: existing } = await admin.auth.admin.getUserById(u.id)
    if (!existing?.user) {
      await admin.auth.admin.createUser({
        id: u.id,
        email: u.email,
        email_confirm: true,
        password: `seed-${u.id.slice(0, 8)}-disabled`,
        user_metadata: { username: u.username },
      })
    }
    await admin.from('user_profiles').upsert(
      { id: u.id, username: u.username, full_name: u.name, onboarded: true, onboarding_completed: true, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
  }

  for (const p of POSTS) {
    const createdAt = hoursAgoIso(p.hoursAgo)
    const up = Math.max(p.score, 1)
    await admin.from('community_posts').upsert(
      {
        id: p.id,
        author_id: userId(p.author),
        board: p.board,
        subject_code: p.subjectCode,
        kind: p.kind,
        flair: p.flair,
        title: p.title,
        body_md: p.bodyMd,
        upvotes: up,
        downvotes: 0,
        score: p.score,
        hot_rank: p.score + (100 - p.hoursAgo) / 100,
        is_pinned: p.pinned ?? false,
        status: 'published',
        created_at: createdAt,
        updated_at: createdAt,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }

  for (const c of COMMENTS) {
    const createdAt = hoursAgoIso(c.hoursAgo)
    await admin.from('community_comments').upsert(
      {
        id: c.id,
        post_id: c.postId,
        author_id: userId(c.author),
        body_md: c.bodyMd,
        upvotes: c.score,
        downvotes: 0,
        score: c.score,
        depth: 0,
        status: 'published',
        created_at: createdAt,
        updated_at: createdAt,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }
}
