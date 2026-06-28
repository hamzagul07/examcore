import { createServiceClient } from '@/lib/supabase-server'
import type { Board, PostKind } from '@/lib/community/posts'

// Bump this when adding a new seed batch — it re-runs the idempotent seed once
// (existing rows skip via ignoreDuplicates; only the new batch is inserted).
const SEED_MARKER = 'b3000001-0000-4000-8000-000000000001'

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

  // ---- Batch 2: seasonal, post-exam -> results day (June 2026 series) ----
  { id: 'b2000001-0000-4000-8000-000000000001', author: 'examroom', board: 'cambridge', subjectCode: '9702', kind: 'discussion', flair: 'Exam reflections', title: 'How did everyone find the June 2026 Physics A-Level papers?', bodyMd: 'Now that **9702** is done — how did Paper 4 treat you? The capacitor question and the last circular-motion part split my whole class. No spoilers needed, just gut feeling: easier or harder than the 2024 papers?', score: 31, comments: 3, pinned: true, hoursAgo: 3 },
  { id: 'b2000002-0000-4000-8000-000000000002', author: 'studyhelper', board: 'cambridge', subjectCode: '9709', kind: 'discussion', flair: 'Exam reflections', title: 'June 2026 Maths — did Pure 3 or Mechanics hit harder?', bodyMd: 'Genuinely split here. **9709** P3 felt long (that integration into partial fractions chain), but M1 had a nasty connected-particles question at the end. Which one cost you more time?', score: 24, comments: 2, hoursAgo: 6 },
  { id: 'b2000003-0000-4000-8000-000000000003', author: 'pastpaper_pro', board: 'cambridge', subjectCode: '9700', kind: 'discussion', flair: 'Exam reflections', title: 'Biology June 2026 Paper 2 — how did the data-handling question go?', bodyMd: '**9700** Paper 2 always has one big data/stats question that decides grades. How did people find the analysis this series — and did you finish in time?', score: 18, comments: 2, hoursAgo: 9 },
  { id: 'b2000004-0000-4000-8000-000000000004', author: 'examroom', board: 'cambridge', subjectCode: '9708', kind: 'discussion', flair: 'Results day', title: 'Results day is 13 August — how is everyone coping with the wait?', bodyMd: 'Six weeks of nothing to do but overthink. For anyone who sat A-Levels this June: what are you doing to stay sane until **results day on 13 August 2026**? Trips, work, getting ahead on uni reading?', score: 27, comments: 3, hoursAgo: 4 },
  { id: 'b2000005-0000-4000-8000-000000000005', author: 'studyhelper', board: 'cambridge', subjectCode: '9701', kind: 'question', flair: 'Grade boundaries', title: 'How do you actually estimate your grade before results day?', bodyMd: 'I have rough raw marks from going through the papers with the mark scheme. How are people turning that into a predicted grade for **9701** when the 2026 boundaries are not out yet?', score: 16, comments: 2, hoursAgo: 7 },
  { id: 'b2000006-0000-4000-8000-000000000006', author: 'pastpaper_pro', board: 'ib', subjectCode: 'physics-hl', kind: 'discussion', flair: 'Exam reflections', title: 'IB Physics HL May 2026 — how did Paper 2 and 3 go?', bodyMd: 'Paper 2 felt long for **Physics HL** and the Option in Paper 3 was time-pressured again. How did everyone find the balance this session?', score: 19, comments: 2, hoursAgo: 8 },
  { id: 'b2000007-0000-4000-8000-000000000007', author: 'examroom', board: 'ib', subjectCode: 'math-aa-hl', kind: 'discussion', flair: 'Results', title: 'IB May 2026 results — anyone else already refreshing the portal?', bodyMd: 'The wait for **Math AA HL** (and everything else) is unreal. How is everyone holding up before results — and do you have a plan if a grade comes back lower than your offer needs?', score: 15, comments: 2, hoursAgo: 5 },
  { id: 'b2000008-0000-4000-8000-000000000008', author: 'studyhelper', board: 'cambridge', subjectCode: '9618', kind: 'discussion', flair: 'Next steps', title: 'Thinking about a November resit — what is your strategy?', bodyMd: 'If a grade does not land where I need it, I might resit **9618** in the November series. For anyone who has resat before: what actually moved your grade the second time?', score: 12, comments: 2, hoursAgo: 11 },

  // ---- Batch 3: more subjects + study-technique threads ----
  { id: 'b3000001-0000-4000-8000-000000000001', author: 'pastpaper_pro', board: 'cambridge', subjectCode: '9706', kind: 'discussion', flair: 'Exam reflections', title: 'Accounting June 2026 — how long did the Paper 3 case study take you?', bodyMd: 'The **9706** Paper 3 case study is a time sink. Did anyone actually finish with time to check? What did you cut to stay on pace?', score: 14, comments: 2, pinned: true, hoursAgo: 4 },
  { id: 'b3000002-0000-4000-8000-000000000002', author: 'examroom', board: 'cambridge', subjectCode: '9990', kind: 'discussion', flair: 'Exam reflections', title: 'Psychology June 2026 — which core studies came up?', bodyMd: 'For **9990** — without breaking any rules, which research areas felt heavily weighted this series? Trying to gauge how the next cohort should prioritise.', score: 11, comments: 2, hoursAgo: 7 },
  { id: 'b3000003-0000-4000-8000-000000000003', author: 'studyhelper', board: 'cambridge', subjectCode: '9609', kind: 'discussion', flair: 'Papers', title: 'Business Paper 3 case study — how do you manage the reading time?', bodyMd: 'For **9609**, do you read the whole case first or dive into the questions? I always feel like I lose 15 minutes just orienting myself.', score: 9, comments: 2, hoursAgo: 10 },
  { id: 'b3000004-0000-4000-8000-000000000004', author: 'examroom', board: 'cambridge', subjectCode: '9709', kind: 'question', flair: 'Revision', title: 'Does active recall actually work for maths, or is it just doing past papers?', bodyMd: 'Everyone says active recall, but for **9709** isn\'t that basically just doing questions from memory? Curious how people apply it to maths specifically.', score: 17, comments: 3, hoursAgo: 5 },
  { id: 'b3000005-0000-4000-8000-000000000005', author: 'pastpaper_pro', board: 'cambridge', subjectCode: '9700', kind: 'discussion', flair: 'Revision', title: 'What is on your Biology flashcards? Building a deck for next year', bodyMd: 'Starting a **9700** flashcard deck over summer. What actually deserves a card vs what is better learned by doing questions?', score: 13, comments: 2, hoursAgo: 13 },
  { id: 'b3000006-0000-4000-8000-000000000006', author: 'studyhelper', board: 'ib', subjectCode: 'biology-hl', kind: 'discussion', flair: 'Exam reflections', title: 'IB Biology HL May 2026 — how was Paper 1 (multiple choice)?', bodyMd: 'Paper 1 for **Biology HL** is brutal under time. Which topics tripped people up this session?', score: 12, comments: 2, hoursAgo: 8 },
  { id: 'b3000007-0000-4000-8000-000000000007', author: 'examroom', board: 'ib', subjectCode: 'economics-hl', kind: 'question', flair: 'Revision', title: 'Best way to revise Economics HL diagrams?', bodyMd: 'For **Economics HL**, do you redraw diagrams from memory or just read them? Trying to make my evaluation paragraphs link back to the diagram properly.', score: 10, comments: 2, hoursAgo: 12 },
  { id: 'b3000008-0000-4000-8000-000000000008', author: 'pastpaper_pro', board: 'cambridge', subjectCode: '9701', kind: 'discussion', flair: 'Revision', title: 'Chemistry 9701 — how do you actually memorise organic mechanisms?', bodyMd: 'Mechanisms are where I bleed marks in **9701**. Curve arrows, conditions, intermediates — what finally made them stick for you?', score: 15, comments: 2, hoursAgo: 6 },
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

  // ---- Batch 2 comments ----
  { id: 'c2000001-0000-4000-8000-000000000001', postId: 'b2000001-0000-4000-8000-000000000001', author: 'studyhelper', bodyMd: 'Harder than 2024 imo — the capacitor discharge calc had an awkward log step. Hoping boundaries drop a bit.', score: 9, hoursAgo: 2 },
  { id: 'c2000002-0000-4000-8000-000000000002', postId: 'b2000001-0000-4000-8000-000000000001', author: 'pastpaper_pro', bodyMd: 'Everyone struggling = lower boundary. Do not panic before the official CAIE thresholds on 13 Aug.', score: 12, hoursAgo: 2 },
  { id: 'c2000003-0000-4000-8000-000000000003', postId: 'b2000001-0000-4000-8000-000000000001', author: 'examroom', bodyMd: 'Add your paper variant (42/52) when you reply so people compare like for like.', score: 5, hoursAgo: 1 },
  { id: 'c2000004-0000-4000-8000-000000000004', postId: 'b2000004-0000-4000-8000-000000000004', author: 'pastpaper_pro', bodyMd: 'Getting ahead on first-year uni maths is the only thing keeping my brain off it.', score: 7, hoursAgo: 3 },
  { id: 'c2000005-0000-4000-8000-000000000005', postId: 'b2000004-0000-4000-8000-000000000004', author: 'studyhelper', bodyMd: 'Part-time job + driving lessons. Highly recommend not doom-scrolling boundary predictions every day.', score: 6, hoursAgo: 2 },
  { id: 'c2000006-0000-4000-8000-000000000006', postId: 'b2000005-0000-4000-8000-000000000005', author: 'examroom', bodyMd: 'Total your raw marks, then compare against the last 2-3 sessions of the same components. Treat it as a range, not a fixed grade.', score: 8, hoursAgo: 6 },
  { id: 'c2000007-0000-4000-8000-000000000007', postId: 'b2000005-0000-4000-8000-000000000005', author: 'pastpaper_pro', bodyMd: 'A grade boundary calculator helps — punch in your raw mark, the paper total, and recent thresholds.', score: 6, hoursAgo: 5 },
  { id: 'c2000008-0000-4000-8000-000000000008', postId: 'b2000007-0000-4000-8000-000000000007', author: 'studyhelper', bodyMd: 'Refreshing does nothing but I cannot stop either. Have a plan B per subject and it gets easier.', score: 5, hoursAgo: 4 },

  // ---- Batch 3 comments ----
  { id: 'c3000001-0000-4000-8000-000000000001', postId: 'b3000004-0000-4000-8000-000000000004', author: 'pastpaper_pro', bodyMd: 'For maths it is: attempt a question type from memory with the book closed, then mark against the scheme and redo what you missed. That IS active recall.', score: 11, hoursAgo: 4 },
  { id: 'c3000002-0000-4000-8000-000000000002', postId: 'b3000004-0000-4000-8000-000000000004', author: 'studyhelper', bodyMd: 'Make cards for the *method* (when to use which substitution) rather than facts. Then do varied questions, spaced out.', score: 8, hoursAgo: 3 },
  { id: 'c3000003-0000-4000-8000-000000000003', postId: 'b3000004-0000-4000-8000-000000000004', author: 'examroom', bodyMd: 'Key bit people skip: actually mark it against the official scheme so you see the exact step that lost the mark.', score: 6, hoursAgo: 2 },
  { id: 'c3000004-0000-4000-8000-000000000004', postId: 'b3000005-0000-4000-8000-000000000005', author: 'examroom', bodyMd: 'Definitions, command-word requirements, and tricky exceptions get cards. Processes (e.g. data questions) are better drilled with past papers.', score: 7, hoursAgo: 10 },
  { id: 'c3000005-0000-4000-8000-000000000005', postId: 'b3000001-0000-4000-8000-000000000001', author: 'studyhelper', bodyMd: 'Barely finished. Skimmed the case once, then went straight to the marks-heavy parts and came back to narrative last.', score: 5, hoursAgo: 3 },
  { id: 'c3000006-0000-4000-8000-000000000006', postId: 'b3000008-0000-4000-8000-000000000008', author: 'examroom', bodyMd: 'Re-draw each mechanism from a blank page, then check arrows/conditions against the mark scheme. Spaced over a week it sticks.', score: 9, hoursAgo: 5 },
  { id: 'c3000007-0000-4000-8000-000000000007', postId: 'b3000006-0000-4000-8000-000000000006', author: 'pastpaper_pro', bodyMd: 'Time was the killer. Flag-and-move on MCQ — never sink three minutes into one mark.', score: 6, hoursAgo: 7 },
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
