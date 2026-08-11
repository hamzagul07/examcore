# Results-week community funnel

How results-day traffic gets into the Exam Room, how to run it for the next
series, and what was learned building it (August 2026).

Companion to [COMMUNITY_TRAFFIC_PLAN.md](COMMUNITY_TRAFFIC_PLAN.md).

## The problem it solves

When the June 2026 thresholds published, site traffic quadrupled to ~2,400
sessions a week — almost all of it Google organic on grade-boundary queries —
and the community took **0.7% of it**. Every step between a reader and a
conversation was a dead end: the call-to-action was missing from the pages with
the traffic, the button that said "post in the thread" went to the feed home,
the threads had no replies, the comment box was a sign-in button, and posting
required clearing a username form that 156 of 168 accounts never had.

## The path, end to end

1. A boundary page renders `ResultsThreadCta` with the reader's subject.
2. The CTA links to `/community/thread/<subject>`, tagged with `utm_source`.
3. That route resolves the live thread for the subject **at click time** and
   redirects, logging the click.
4. The thread has an official first reply with a worked example.
5. The composer takes typing while signed out and holds the draft across
   sign-in.
6. A username is assigned (or chosen) on first contribution — never a gate.
7. The weekly digest is offered *after* the comment lands.

## Running it for a new series

```bash
# 1. Ingest the threshold tables first — nothing below works without them.
pnpm grade:thresholds:ingest

# 2. Open a thread for every syllabus that has tables and does not have one.
pnpm community:seed-threads --dry
pnpm community:seed-threads

# 3. Give each new thread an official first reply.
node scripts/seed-results-thread-first-replies.mjs --dry
node scripts/seed-results-thread-first-replies.mjs

# 4. Clear pins left over from the previous series.
pnpm community:unpin-stale --dry
pnpm community:unpin-stale

# 5. Check whether any of it worked.
pnpm community:funnel 7
```

Every one is idempotent and has a `--dry`. Step 2 also repairs threads whose
`hot_rank` is stuck at 0 (see gotchas).

`CYCLE_START` in `scripts/seed-results-threads.ts`,
`scripts/unpin-stale-pins.ts` and `lib/community/results-thread-rank.ts` marks
the current series. **Move it when a new series publishes** — it is what makes
"this cycle" mean anything.

## What `pnpm community:funnel` tells you

Opens with real people whose post or question nobody answered, oldest first.
Then CTA clicks by source page and subject, community reach, and real
contributions with seeded accounts excluded.

A reply from a badged team account counts as answered; a reply from a seeded
persona does not.

## Gotchas found the hard way

**A `<Link>` to a route handler must set `prefetch={false}`.** Next prefetches
links entering the viewport, in production only. The CTA href does a database
read and writes a click row, so the default turned the click metric into a
scroll metric and wrote a row per impression. This will not reproduce locally.

**`hot_rank` comes from the vote trigger, not from the insert.** A post created
without its author's self-upvote keeps the column default of `0` and sorts to
the bottom of the hot feed. `createPost` inserts the vote; anything writing
posts directly must too.

**`page_events.path` stores `usePathname()` — no query string.** Any `utm_*`
tag on an internal link is gone by the time it lands. Log the click server-side
instead; `/__cta/...` mirrors the existing `/__funnel/...` convention.

**PostgREST silently caps a select at 1000 rows.** A week of `page_events` is
several times that. Paginate with `.range()` and *throw* on error — a report
that under-counts looks like data.

**`.update().eq('id', …)` is a no-op when the row does not exist**, and returns
no error. 45 accounts have no `user_profiles` row, because profiles are written
at onboarding and nothing stops someone signing in and going straight to the
community. Upsert for anything a user is told was saved.

**`.in()` is a query string.** A UUID costs ~38 characters, so a few hundred ids
build a URL past what sits in front of PostgREST. Chunk at ~100.

**Marketing pages are not prerendered.** `MarketingSiteShell` calls `headers()`,
which puts the whole tree on request-time rendering, so date-phase-aware copy
stays live and needs no scheduled deploy. Of 542 prerendered routes, the 467
under `/blog/` are opengraph images.

## Rules this follows

- **ON-02** — non-essential mail is opt-in and never pre-ticked. The digest is
  therefore asked for after a contribution, not defaulted on. Only a refusal is
  stored client-side; the subscription lives on the profile.
- **AU-01** — no username field at signup. Hence assign-on-first-contribution,
  with an optional field for people who want to choose.
- **Official accounts are badged.** Anything the platform posts under
  `markscheme_answers` or `MarkScheme_Team` shows an Official badge. No student
  personas, no invented raw marks, no fabricated peer replies — the seeding
  scripts generate their numbers from `content/data/grade-boundaries` so a
  thread cannot quote a figure the source does not contain.
