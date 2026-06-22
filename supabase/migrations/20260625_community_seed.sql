-- Seed Exam Room with starter discussions, Q&A, and comments (Cambridge A-Level + IB).
-- Idempotent: fixed UUIDs + ON CONFLICT — safe alongside real user posts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  u1 uuid := 'a1000001-0000-4000-8000-000000000001';
  u2 uuid := 'a1000002-0000-4000-8000-000000000002';
  u3 uuid := 'a1000003-0000-4000-8000-000000000003';
  inst uuid := '00000000-0000-0000-0000-000000000000';
  p1 uuid := 'b1000001-0000-4000-8000-000000000001';
  p2 uuid := 'b1000002-0000-4000-8000-000000000002';
  p3 uuid := 'b1000003-0000-4000-8000-000000000003';
  p4 uuid := 'b1000004-0000-4000-8000-000000000004';
  p5 uuid := 'b1000005-0000-4000-8000-000000000005';
  p6 uuid := 'b1000006-0000-4000-8000-000000000006';
  p7 uuid := 'b1000007-0000-4000-8000-000000000007';
  p8 uuid := 'b1000008-0000-4000-8000-000000000008';
  p9 uuid := 'b1000009-0000-4000-8000-000000000009';
  p10 uuid := 'b1000010-0000-4000-8000-000000000010';
  p11 uuid := 'b1000011-0000-4000-8000-000000000011';
  p12 uuid := 'b1000012-0000-4000-8000-000000000012';
BEGIN
  -- Always ensure seed personas exist (idempotent — does not delete user posts).
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (inst, u1, 'authenticated', 'authenticated', 'examroom-seed@examcore.internal', crypt('disabled', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"examroom"}'::jsonb, now(), now()),
    (inst, u2, 'authenticated', 'authenticated', 'studyhelper-seed@examcore.internal', crypt('disabled', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"studyhelper"}'::jsonb, now(), now()),
    (inst, u3, 'authenticated', 'authenticated', 'pastpaper-seed@examcore.internal', crypt('disabled', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"pastpaper_pro"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, username, full_name, onboarded, onboarding_completed, updated_at)
  VALUES
    (u1, 'examroom', 'Exam Room', true, true, now()),
    (u2, 'studyhelper', 'Study Helper', true, true, now()),
    (u3, 'pastpaper_pro', 'Past Paper Pro', true, true, now())
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

  INSERT INTO public.community_posts (id, author_id, board, subject_code, kind, flair, title, body_md, upvotes, downvotes, score, comment_count, hot_rank, is_pinned, created_at) VALUES
  (p1, u1, 'cambridge', '9702', 'discussion', 'Grade boundaries',
   'May/June 2024 Physics A-Level grade boundaries — what are you expecting?',
   'Saw a few people online saying P4 was brutal this year. For those who sat **9702** in MJ24 — what raw marks are you hoping for a B vs an A?

Drop your paper + rough score if you''re comfortable. Always take boundary rumours with a pinch of salt until CAIE publish.', 28, 1, 27, 3, public.community_hot(27, now() - interval '2 hours'), true, now() - interval '2 hours'),

  (p2, u2, 'cambridge', '9709', 'discussion', 'Papers',
   'Pure 3 vs Mechanics — which paper did you find harder this series?',
   'Genuinely split in my year group. P3 integration felt longer than usual but M1 vectors tripped people up on Q7.

Which component did you lose more marks on — and why?', 19, 0, 19, 2, public.community_hot(19, now() - interval '5 hours'), false, now() - interval '5 hours'),

  (p3, u1, 'cambridge', '9618', 'discussion', 'NEA',
   'A-Level Computer Science NEA — project ideas that actually score well',
   'Looking for **9618** NEA ideas that aren''t "another booking system". Markers see hundreds of those.

What worked for you — or what would you avoid? Real users, clear success criteria, and something you can actually test matter more than flashy UI.', 15, 1, 14, 2, public.community_hot(14, now() - interval '8 hours'), false, now() - interval '8 hours'),

  (p4, u3, 'cambridge', '9700', 'discussion', 'Revision',
   'Bio paper 2 data analysis — tips for the maths-heavy questions?',
   'Paper 2 always punishes students who memorise facts but freeze on graphs, chi-squared, and semi-log plots.

Share any routines or checklist you use when you see a data question in **9700**.', 12, 0, 12, 2, public.community_hot(12, now() - interval '12 hours'), false, now() - interval '12 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ── IB Diploma discussions ───────────────────────────────────────────────
  INSERT INTO public.community_posts (id, author_id, board, subject_code, kind, flair, title, body_md, upvotes, downvotes, score, comment_count, hot_rank, is_pinned, created_at) VALUES
  (p5, u1, 'ib', 'physics-hl', 'discussion', 'Grade boundaries',
   'IB Physics HL May 2024 boundaries — 6 or 7 cutoffs?',
   'HL Paper 3 options felt time-pressured. For **Physics HL** candidates: which paper hurt most, and what boundary are you expecting for a 6 vs 7?

Remember IB boundaries shift every session — share reasoning, not just wishful thinking.', 22, 2, 20, 3, public.community_hot(20, now() - interval '3 hours'), true, now() - interval '3 hours'),

  (p6, u2, 'ib', 'math-aa-hl', 'discussion', 'IA',
   'Math AA HL IA topics that markers don''t get bored marking',
   'Trying to pick an **Math AA HL** IA topic that has enough maths depth without being a copy-paste from Reddit.

What topics scored well for you — modelling, optimisation, stats? What did you wish you''d known before starting?', 17, 0, 17, 2, public.community_hot(17, now() - interval '6 hours'), false, now() - interval '6 hours'),

  (p7, u3, 'ib', 'economics-hl', 'discussion', 'Exams',
   'IB Economics HL Paper 3 — macro predictions for 2025',
   'Policy mix, exchange rates, and development always show up. For **Economics HL** — what macro themes are you revising hardest for the next session?

Share essay structures that helped you hit Level 3 in the 15-markers.', 11, 1, 10, 2, public.community_hot(10, now() - interval '10 hours'), false, now() - interval '10 hours'),

  (p8, u1, 'ib', 'chemistry-hl', 'discussion', 'Options',
   'Is IB Chemistry HL Option B (Biochemistry) worth doing?',
   'Our school defaults to Option B. Some say it''s content-heavy; others like the link to medicine.

If you took **Chemistry HL** — which option did you pick and would you recommend it?', 9, 0, 9, 2, public.community_hot(9, now() - interval '14 hours'), false, now() - interval '14 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ── Questions (with answer-style comments below) ─────────────────────────
  INSERT INTO public.community_posts (id, author_id, board, subject_code, kind, flair, title, body_md, upvotes, downvotes, score, comment_count, hot_rank, created_at) VALUES
  (p9, u2, 'cambridge', '9702', 'question', 'Mechanics',
   'Why is centripetal force not a real force?',
   'Every explanation online says "it''s the resultant" but examiners still write $F = mv^2/r$ on mark schemes.

How do you explain this in a **9702** P4 answer without losing method marks?', 14, 0, 14, 2, public.community_hot(14, now() - interval '7 hours'), now() - interval '7 hours'),

  (p10, u3, 'ib', 'math-aa-hl', 'question', 'IA',
   'How do you prove series convergence rigorously for Math AA HL IA?',
   'My teacher wants epsilon-style reasoning, not just "nth term → 0".

What level of proof is enough for **Math AA HL** IA without overcomplicating?', 10, 0, 10, 2, public.community_hot(10, now() - interval '9 hours'), now() - interval '9 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ── Resources ────────────────────────────────────────────────────────────
  INSERT INTO public.community_posts (id, author_id, board, subject_code, kind, flair, title, body_md, upvotes, downvotes, score, comment_count, hot_rank, created_at) VALUES
  (p11, u1, 'cambridge', '9709', 'resource', 'Cheat sheet',
   'My P3 formula sheet — everything I actually use in exams',
   'Compiled after marking a dozen past papers on MarkScheme. Covers trig identities, integration tricks, and complex-number shortcuts for **9709** Pure 3.

Happy to upload a PDF if people want — comment and I''ll add it.', 21, 0, 21, 1, public.community_hot(21, now() - interval '4 hours'), now() - interval '4 hours'),

  (p12, u2, 'ib', 'biology-sl', 'resource', 'Notes',
   'Topic 6 Human physiology — one-page summary (SL)',
   'Condensed **Biology SL** Topic 6 notes: heart, ventilation, immunity, kidneys. Good for last-week revision.

Not a substitute for the textbook — but useful for spotting gaps before Paper 2.', 8, 0, 8, 1, public.community_hot(8, now() - interval '16 hours'), now() - interval '16 hours')
  ON CONFLICT (id) DO NOTHING;

  -- ── Comments (answers & discussion) ─────────────────────────────────────
  INSERT INTO public.community_comments (id, post_id, author_id, body_md, upvotes, downvotes, score, depth, created_at) VALUES
  ('c1000001-0000-4000-8000-000000000001', p1, u2, 'P4 felt harder than 2023 for us too — lost marks on uncertainty questions. I''m hoping ~55/80 for an A but who knows.', 8, 0, 8, 0, now() - interval '1 hour'),
  ('c1000002-0000-4000-8000-000000000002', p1, u3, 'Boundaries usually move when everyone struggles — if forums are right, A might dip a few marks. Wait for official tables.', 12, 1, 11, 0, now() - interval '45 minutes'),
  ('c1000003-0000-4000-8000-000000000003', p1, u1, 'Pinning this thread — share paper codes (e.g. 42 vs 52) when you comment so others can compare.', 5, 0, 5, 0, now() - interval '30 minutes'),

  ('c1000004-0000-4000-8000-000000000004', p2, u3, 'M1 for me — that vector question with the pulley system. Pure 3 was long but familiar.', 6, 0, 6, 0, now() - interval '4 hours'),
  ('c1000005-0000-4000-8000-000000000005', p2, u1, 'Opposite here — P3 integration by parts stacked up. Mechanics felt more standard.', 4, 0, 4, 0, now() - interval '3 hours'),

  ('c1000006-0000-4000-8000-000000000006', p3, u2, 'Did a weather-station logger with real sensors — boring topic but full marks on testing criteria.', 7, 0, 7, 0, now() - interval '7 hours'),
  ('c1000007-0000-4000-8000-000000000007', p3, u3, 'Avoid games unless you can justify complexity. Database + CRUD with real users beats flashy graphics.', 9, 0, 9, 0, now() - interval '6 hours'),

  ('c1000008-0000-4000-8000-000000000008', p4, u1, 'Always label axes + units first. Examiners love "describe the trend" before you calculate anything.', 5, 0, 5, 0, now() - interval '11 hours'),
  ('c1000009-0000-4000-8000-000000000009', p4, u2, 'Chi-squared: write H0/H1 and expected frequencies in a table — method marks are there even if arithmetic slips.', 6, 0, 6, 0, now() - interval '10 hours'),

  ('c1000010-0000-4000-8000-000000000010', p5, u2, 'Paper 2 EM was the killer. Heard 7 boundary might be low 70s% but IB will adjust.', 5, 0, 5, 0, now() - interval '2 hours'),
  ('c1000011-0000-4000-8000-000000000011', p5, u3, 'Option D astrophysics — know your Hertzsprung-Russell diagram cold. Easy marks if you memorise features.', 8, 0, 8, 0, now() - interval '90 minutes'),
  ('c1000012-0000-4000-8000-000000000012', p5, u1, 'Don''t forget uncertainty propagation in IA-style practical questions — shows up every year.', 4, 0, 4, 0, now() - interval '1 hour'),

  ('c1000013-0000-4000-8000-000000000013', p6, u3, 'Modelling epidemics with differential equations scored well — enough depth, clear real data.', 6, 0, 6, 0, now() - interval '5 hours'),
  ('c1000014-0000-4000-8000-000000000014', p6, u1, 'Avoid copying Desmos art projects. Markers want maths you can defend in the personal engagement section.', 7, 0, 7, 0, now() - interval '4 hours'),

  ('c1000015-0000-4000-8000-000000000015', p7, u1, 'Exchange rate + J-curve essays need diagrams. Practise drawing labelled graphs under timed conditions.', 3, 0, 3, 0, now() - interval '9 hours'),
  ('c1000016-0000-4000-8000-000000000016', p7, u2, 'Development economics linking to SDGs — good for 15-markers if you bring real country examples.', 4, 0, 4, 0, now() - interval '8 hours'),

  ('c1000017-0000-4000-8000-000000000017', p8, u2, 'Option B is heavy but links to uni bio. Option D (medicinal chem) is popular if you like organic mechanisms.', 3, 0, 3, 0, now() - interval '13 hours'),
  ('c1000018-0000-4000-8000-000000000018', p8, u3, 'Pick what your teacher knows best — they mark IA and run labs for that option every year.', 5, 0, 5, 0, now() - interval '12 hours'),

  ('c1000019-0000-4000-8000-000000000019', p9, u1, 'Say centripetal acceleration is provided by a **real** force (tension, friction, weight component). $mv^2/r$ is the **magnitude** of that resultant inward force — not a separate force on FBDs.', 11, 0, 11, 0, now() - interval '6 hours'),
  ('c1000020-0000-4000-8000-000000000020', p9, u3, 'Draw FBD with only real forces. Then write "resultant radial force = $mv^2/r$" for full method marks in 9702.', 9, 0, 9, 0, now() - interval '5 hours'),

  ('c1000021-0000-4000-8000-000000000021', p10, u1, 'Comparison test + limit comparison is usually enough for IA. Full epsilon proofs are overkill unless your topic demands it.', 6, 0, 6, 0, now() - interval '8 hours'),
  ('c1000022-0000-4000-8000-000000000022', p10, u2, 'Use technology to plot partial sums, then prove convergence with ratio or integral test — shows exploration + rigour.', 5, 0, 5, 0, now() - interval '7 hours'),

  ('c1000023-0000-4000-8000-000000000023', p11, u2, 'Yes please upload the PDF — would save me rebuilding mine before mocks.', 4, 0, 4, 0, now() - interval '3 hours'),
  ('c1000024-0000-4000-8000-000000000024', p12, u3, 'This is exactly what I needed for Topic 6 — any chance you have Topic 5 enzymes too?', 3, 0, 3, 0, now() - interval '15 hours')
  ON CONFLICT (id) DO NOTHING;

END $$;
