# MarkScheme Creators — a space for small study-tips creators

Written 2026-09-23. Target: **small student creators** (roughly 1k–50k
followers) on TikTok, Reels and Shorts who post exam tips, revision hacks,
"how I got 9 A*s", brainrot revision, study-with-me. They are 15–22, mostly
students themselves, post 3–5 times a week, and make a video in 15–30 minutes.
They are not teachers and do not explain subject content; their asset is
relatability, hooks and the trust of people their own age.

Public label on every surface: **"Study with @handle"**.

## TL;DR

Give each creator a space (`/with/@handle`), a **creator code** their followers
say or type, a pool of **gift marks** they hand out, and a **weekly number
about their own audience** that only a marking product can produce ("62% of
your followers lost the evaluation mark this week"). Count *answers marked*,
not clicks or signups. Pay in product and recognition; pay cash only to 18+
creators, later, per approved video, the way Knowunity does.

## What the evidence says about this exact creator

- **Knowunity** is the only edtech that scaled with 16–22-year-old tips
  creators: 4,000+ creators, €1.2M paid, 3B views. Rules: 0 followers needed,
  3–5 short videos a week, 15–30 min each, Knowunity supplies "hooks, scripts
  and reference videos", fixed fee per approved video plus a bonus if it
  passes a view threshold in 7 days, under-18s need parental consent and are
  paid to a parent's account, no competing study apps. Its 380k *unpaid*
  "Knowers" are motivated, per the CEO, by social recognition and a following
  on the platform; cash is "pocket money".
- **Nano creator rates 2026:** $25–150 per TikTok video for 1k–10k followers;
  engagement 8–20% versus 0.5–2% for large accounts; 20× more views per
  follower. Small is the right size for a small budget.
- **ZNotes** gets 1,000+ volunteer applicants a year for a certificate, a
  named page and CAS hours. Recognition that goes on a university application
  is currency for this age group.
- **Programs stall** when the creator gets a code and then hears nothing.
  Knowunity's answer is a stream of formats; ours can be formats **plus real
  numbers from their own audience**.
- **Compliance:** a free seat is "gifted product", so the post is an ad under
  UK ASA/CAP and India ASCI ("#ad" upfront). Payment providers require 18+.
  UAE requires an advertiser permit for any promotional content since
  1 Feb 2026 (UAE is a top-10 country for us: 261 sessions in 30 days).

## Why the design counts marked answers, not signups

Production, last 30 days: ~14,100 sessions, **11 from social**; 249 signups
but **13** signed-in users marked anything; **113 of 143 attempts were by
guests** (1 free mark a day, no account). A creator whose followers mark 200
answers as guests has done more for MarkScheme than one who produces 200
signups that never mark. So a creator's counter must count guest attempts,
which means attribution has to live on the attempt, not only on the account.

## The creator's space

**`/with/@handle`** (extends the existing contributor profile `/u/[username]`)
- Creator badge, bio, links to their TikTok/Instagram/YouTube.
- **Students marked with @handle** (live), **students joined**, followers.
- Their tips: short posts (community posts with a `tip` flair) pinned here.
- Their current **tip test** (below) with its running result.
- Follow button (`community_follows` exists; no web UI yet).

**Creator code** (e.g. `MAYA`)
- TikTok captions are not clickable, so a spoken or typed code beats a link.
  Entered on the mark page ("Got a creator code?") or at signup; also carried
  by `/with/@handle` links and the bio link.
- The code is the creator's **gift**: a follower who uses it gets extra free
  marks (e.g. +5 for the month). The creator is giving something, not selling
  something; that is a status move for a 17-year-old, and it is the reason a
  follower bothers to type it.
- Each creator has a monthly gift pool we set (cost control) and can see how
  much of it has been claimed.

**Guiding their students**
- "Tip of the week from @maya" card on the dashboard of every student who
  joined through her or follows her.
- Community: their tips post to the subject room; their students' questions
  can @mention them; they answer in the thread. No new "space" tables.
- Aggregates only. A creator never sees a student's name, script or score.

## The content engine (why they keep posting)

Every week the creator gets a short brief by email: three hooks, one
screen-record format, and **this week's number** from their audience.
Formats only MarkScheme can give them:

1. **"I let an AI examiner mark my answer."** Screen-record the examiner ink
   on their own handwritten answer and the score reveal. The reveal already
   has a deliberate cinematic pause; it is made for a phone screen.
2. **Tip test.** The creator picks a tip they already posted ("define the
   command word first", "PEEL for 6-markers"). We attach one matching
   question from the 1,320 in the bank. Followers try the tip, use the code,
   get marked. After 50 answers the creator gets the result: "followers who
   tried it averaged 4.6/6". That is the follow-up video, and it is proof
   their tip works, which nobody in #studytok can currently show.
3. **"Where you all lose marks."** The cohort gap report already built for
   teachers, filtered to the creator's audience: "62% of you dropped the
   evaluation mark; the examiner's most common note was *'asserts without
   weighing the counter-case'*." Tips creators normally guess at this.
4. **Milestone posts.** "500 students marked with @maya" comes with a share
   card, a shout-out from MarkScheme's account, and a certificate.

## Reward ladder

| Level | Trigger | Gets |
|---|---|---|
| Creator | accepted (any age 15+, verified by hand) | space, code, gift pool, Max seat free, weekly brief, badge |
| 100 students marked | automatic | "Top creator" badge, featured on `/creators`, bigger gift pool |
| 500 students marked | automatic | certificate (for university apps / CAS-style evidence), early access, MarkScheme socials feature |
| Paid creator (later, 18+ only) | when there is budget | fixed fee per approved video + view bonus (Knowunity structure); start at nano rates, ~$30 a video, 5 creators × 4 videos = ~$600 a month |

Rules: under-18 creators get product and recognition only, never cash. Log
every paid conversion attributed to a creator from day one (Polar checkout
`metadata` → webhook → ledger) so revenue share can be paid retroactively once
it exists; Duolingo paid $4M to close its unpaid contributor program badly.
Share kit ships with "#ad" and the bio line pre-written. No UAE-based minors.

## Recruiting: where and what to say

Find them on the TikTok discover pages for `gcse revision tips`,
`igcse exam revision tips`, `studytok a levels`, `ib dp biology paper 2026`,
`brainrot exam igcse`, and the Instagram/YouTube-Shorts equivalents; plus our
own top users (five accounts do most signed-in marking). Never invent handles;
build the list by hand and keep it in `outreach_targets` with
`utm_source=creator-<handle>`.

Lead with a gift, ask for nothing:

> I made you a space on MarkScheme: markscheme.app/with/maya. Your followers
> get 5 free marks with code MAYA (it marks their real handwritten answers
> against the actual mark scheme in about 90 seconds, no account needed). You
> get a live count of everyone you've helped, and once 50 of them have tried
> it I'll send you the one mark most of them lost, which usually makes a good
> video. Nothing to sign; if you like it, put the code in your bio.

## Build — reuse first

**Reused as-is**
- Contributor profile `app/(marketing)/(chrome)/u/[username]/page.tsx`,
  `lib/community/profile.ts`, `badgesForReputation`, `community_follows`.
- Guest marking + `GuestConversionPrompt` (`app/mark/page.tsx`); the mark
  handoff `lib/courses/mark-handoff.ts` to prefill a tip-test question.
- Question bank `extracted_questions`; community anchor `paper_question`.
- Cohort gap report `lib/teacher/cohort-gaps.ts` `buildCohortGapReport()`.
- Seat pattern: `teacher_verified_at` + `capForAccess()` +
  `scripts/grant-teacher-seat.ts` (copy → `creator:grant`).
- Gift marks: `ensureGiftCredits()` in `lib/max/gifts.ts` (idempotent).
- Readable codes: `generate_invite_code()` (6 chars, no confusables) or let
  the creator choose a handle-based code.
- Digest email: the `community-digest` cron + `lib/email/templates.ts`.
- OG cards: the `/challenge/[id]` + `/api/og/challenge` pattern.
- Dashboard slot: `lib/dashboard/next-action.ts` / `NextActionCard`.

**New (small)**
- `creators` (user_id, code, status, verified_at, adult, links, gift_pool,
  gift_claimed), `creator_tip_tests` (creator_id, question_id, tip_text,
  active), `creator_conversions` (ledger).
- `mark_runs.creator_code` and `attempts.creator_code` (mark_runs opens before
  the model call, so guest and failed runs count).
- `user_profiles.referred_by` — protected column: add to the column-grants
  migration and to `audit_client_grants()` (copy the body from the latest
  migration that defines it; see memory `audit_client_grants re-declare gotcha`).
- Durable cookie `ms_ref` (30 days) set by `/with/@handle` and by code entry;
  read in `app/auth/callback/route.ts` and the password signup path (the
  current sessionStorage attribution loses magic-link signups).
- Routes: `/with/[handle]`, `/creators` (public list), `/creator` (their
  dashboard: counters, gift pool, tip test result, share kit).
- Code field on `/mark` (guest) and on signup.

**Slices**
1. *Space + code + counter.* Tables, `/with/[handle]`, code entry on `/mark`
   and signup, `creator_code` on runs/attempts, gift marks on code use,
   creator dashboard with the counter, `pnpm creator:grant`. Recruit 5 by hand.
2. *Content engine.* Tip test, audience mark-loss stat, weekly brief email,
   share kit with "#ad", milestone badges.
3. *Community + money.* Follow feed and tip-of-the-week on students'
   dashboards, `/creators` page, Polar metadata → ledger, paid tier for 18+.

Zero-code test in parallel with slice 1: DM 10 creators with the message
above using a plain `/mark?utm_source=creator-<handle>` link. Reply rate and
whether anyone actually posts decide whether slice 2 is built.

## What to measure

KPI order: **answers marked via creator** → students joined → paid
conversions attributed. Never rank creators by sessions or clicks.

```sql
select c.code,
       count(r.id)                                      as runs,
       count(r.id) filter (where r.status = 'completed') as marked,
       count(*)    filter (where r.user_id is null)      as guest_answers,
       count(distinct r.user_id)                         as signed_in_students,
       (select count(*) from user_profiles p where p.referred_by = c.user_id) as joined,
       c.gift_claimed
from creators c
left join mark_runs r on r.creator_code = c.code
group by c.code, c.gift_claimed
order by marked desc;
```

## Pitfalls specific to this design

- Gift marks are real cost (each mark is 3–4 Gemini Pro calls). Cap the
  monthly pool per creator and cap concurrent guest runs per code; a video
  that lands can send hundreds of people in an hour.
- A code typed by a guest can be reused daily by the same person; that is
  fine for the creator's counter, but joined and paid are our numbers. Show
  all three.
- Aggregates only, ever. Followers are public; marks are not.
- Do not gate anything on self-declared `role`; use the service-role
  `verified_at` column like teacher seats.
- Leaderboards can crowd out the intrinsic motivation this age group runs on.
  Rank by students helped, keep it to a top list, no public ranks below it.

## Build status (2026-09-23)

Slice 1 is built on branch `feat/creators`; migration `20260923_creators.sql`
is applied to production.

- Public space `/with/[handle]` (+ OG image), directory `/creators`, studio
  `/creator` (signed-in; the dashboard shows a card for creators).
- Creator code on `/mark` (`CreatorCodeChip`), `?code=` and `/with/<handle>`
  set the `ms_ref` cookie in `proxy.ts`; signup (`/auth/callback` and the
  password path) claims it: `user_profiles.referred_by` + gift marks via
  `try_apply_credit_topup`, one claim per (creator, student).
- `mark_runs.creator_code` / `attempts.creator_code` stamped by
  `/api/mark/process`, so guest answers count. Stats and the audience gap
  report (`buildCohortGapReport` keyed to the code, locked under 50 answers)
  live in `lib/creators/service.ts`.
- Two plain Postgres functions (`20260923b_creator_rpcs.sql`, applied):
  `claim_creator_code` computes the pool and inserts the claim under a row
  lock on the creator, so a burst cannot exceed `gift_pool_monthly`;
  `creator_stats` is the one grouped query behind the directory and the
  studio. A typed code also sets the cookie via `POST /api/creators/ref`, so
  a follower who heard the code in a video is credited at signup.
- After the mark: `PostMarkCreatorCard` under the score ("Marked with
  @handle", the code, the gift, a signup link that carries the code). The
  whole-paper path stamps the attempt too. Studio gained a 30-day sparkline
  (`CreatorSparkline`, attempts per UTC day) and the share card as a
  downloadable image. `creator_stats` counts answers from `attempts`
  (`20260923c`), so whole-paper and multi-question scripts count.
- Referred students see `FromYourCreatorCard` on their dashboard (creator,
  latest post, code); `/u/[username]` shows the creator badge and a link to
  the space; `/creators` is in the footer and the sitemap; both public pages
  carry breadcrumb JSON-LD. Verified end to end on 2026-09-23: a guest marked
  a typed answer with code MAYA, saw the card, and the studio counted it.
- Creator seat = Scholar access + the teacher marking cap
  (`effectiveAccess({ creatorVerified })`, `enforcement.ts`).
- Grant with `pnpm creator:grant <email> <CODE> --handle h --name n --tagline t
  --tiktok @x [--adult]`; `--list`, `--pause`, `--resume`. Tests:
  `pnpm test:creators`, `pnpm test:grants`.

Not built yet (slices 2–3): tip tests, weekly brief email, milestone badges
on the community profile, follow feed / tip-of-the-week on students'
dashboards, Polar metadata ledger, the paid tier.

## Sources (2026-09-23)

- knowunity.com/creators (eligibility 16–22, 0 followers, 3–5 videos/week,
  15–30 min, hooks/scripts supplied, fee per approved video + 7-day view
  bonus, parent payout under 18, 4,000+ creators, €1.2M+, 3B+ views); Sifted
  and Tech.eu on Knowers and motivation.
- Nano/micro rate guides 2026 (Influencer Marketing Hub, OpenSponsorship,
  InfluencerFee): $25–150 per TikTok video under 10k followers.
- ZNotes contributor page and MIT Solve profile.
- ASA/CAP "Recognising ads: social media" and under-16 ambassador guidance;
  ASCI influencer guidelines; UAE Media Council advertiser permit (Feb 2026);
  Stripe/PayPal 18+ rules.
- Duolingo, "Ending and honoring our volunteer contributor program".
- BrandChamp / Medium on why ambassador programs stall.
