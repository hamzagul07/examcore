# MarkScheme — Growth & Monetisation Plan (H2 2026)

Written 2026-07-28. Every number below was measured from the production database
on that date, not estimated. Re-run the SQL in §7 to refresh.

---

## 1. Where you actually are

**Audience**
| Metric | Value | Window |
|---|---|---|
| Tracked sessions | 812 | 14 days (~58/day) |
| Registered users | 105 total, 82 new, 16 new | lifetime / 30d / 7d |
| Sessions reaching `/mark` | 86 | 14 days |
| Sessions reaching `/pricing` | 29 (3.6%) | 14 days |
| IB-page sessions | 313 (39% of all traffic) | 14 days |
| Blog sessions | 322 (40% of all traffic) | 14 days |

**Money**
| Metric | Value |
|---|---|
| Active paid subscriptions | **1** (Scholar, $19.99) |
| Trialing | 1 |
| Past due | 1 |
| MRR | **~$20** |
| Free-tier subscription rows | 129 |

**Product usage**
| Metric | Value |
|---|---|
| Attempts, lifetime | 178 |
| Distinct users who marked anything in 30d | **6** |
| `mark_runs` since telemetry shipped | 10 — all on 2026-07-27, all typed, all guest, all 9700 |
| `mark_feedback` rows | **0** |
| Users with a target grade set | **0** |
| Community questions seeded | 446 (27 sessions/14d) |

Read that table honestly: you have a 3,000-page site, a genuinely deep marking
engine, a community platform, courses for every IB subject — and six people
marked something last month. One person pays you.

---

## 2. Diagnosis: this is not a traffic problem

The instinct is "get more visitors." That is the wrong first move, because the
funnel currently converts traffic into nothing. Pouring 10× traffic into it
produces 10× nothing. Four structural defects, in order of how much money they
cost:

### 2.1 The quota ladder is inverted — paying makes you worse off

| Who you are | Marks you get |
|---|---|
| Anonymous guest | **10 per day** (`ANON_DAILY_MARK_LIMIT`, `lib/rate-limit.ts:3`) ≈ 300/month |
| Signed-in, free | **5 per month** (`TIER_MONTHLY_CAPS.free`, `lib/billing/caps.ts`) |
| Pro, $11/month | 50 per month |
| Scholar, $19.99/month | 120 per month |
| Max, $35/month | 250 per month |

A guest gets **60× more marking than a free account and 6× more than a $11
customer**. Creating an account is a downgrade. Paying $35/month buys you less
than clearing your cookies. Nothing else in this plan matters until this is
fixed — you are actively teaching users that anonymity is the best plan.

### 2.2 Nobody experiences the paid product

The reverse trial was removed (`lib/billing/access.ts:5` — "no longer granted on
signup"). Everything shipped in the premium-feel initiative — full-script verify
pass, rewrite-to-full-marks, weak-spot drills, grade trajectory, weekly examiner
report, Omni with student memory — is invisible to 100% of your users, because
zero of them are paid. You built a premium product nobody has ever seen. The
evidence: **0 users have set a target grade**, the input that drives the
trajectory card and the weekly email.

### 2.3 The pitch describes the flow you just replaced

`components/landing/LandingHero.tsx:57` still says *"Photograph your handwritten
answer."* On 2026-07-27 you shipped typed answers — and the marking page went
from **0 submissions in five days to 10 in one evening**. Photograph-only was
the wall. The homepage still advertises the wall. Every laptop user reads the
hero and self-selects out.

### 2.4 You are flying blind on attribution

`page_events.referrer` is **null on all 812 sessions**. You cannot tell organic
from Reddit from direct. Any channel spend right now is unmeasurable, which
means it is unmanageable.

**Secondary:** `mark_feedback` has 0 rows, so `LandingProof` renders nothing —
the landing page has no social proof at all, in a category where trust ("does it
mark like a real examiner?") is the entire purchase decision.

---

## 3. The market, and where you actually sit

| Product | Price | Angle |
|---|---|---|
| **RevisionDojo** | Free / Plus $17 / Pro $19 (AI grading in Pro) | IB-first, grew on TikTok #studytok, **free bulk AI grading for schools** as a land-grab |
| **Top Marks AI** | 400+ per-question-type tools, 40+ subjects | UK GCSE/A-Level, breadth |
| **exam-mate** | Question bank + AI marker | IGCSE/A-Level/IB, teacher-oriented |
| **Tutopiya** | Free for teachers | Cambridge/Edexcel, review-and-override |
| **AI Examiner, MarkMe, Remarkable AI** | Free tiers | UK-centric, thin |
| **MarkScheme** | Free 5 / $11 / $19.99 / $35 | Cambridge **+** IB, real mark schemes, Examiner's Ink |

Your ladder straddles RevisionDojo's $17–19 with three tiers. Three tiers is one
too many for a product with one customer — it splits a decision nobody is making
yet and dilutes the story.

**The defensible position is the artefact, not the answer.** Every competitor
returns a grade and a paragraph. You return *the script with examiner ink in the
margins, per mark-point, tied to the official scheme* — M1/A1 annotations a
teacher would recognise. That is the thing a student screenshots and a teacher
trusts. It is also, per the additive-only rule, free — correctly, because it is
the hook.

So: **free gives you the ink. Paid gives you the coach.** Marking is the demo;
the product is what happens across twenty marks — weak-topic tracking, drills,
trajectory to target grade, weekly examiner report.

---

## 4. Timing — the calendar decides the plan

- **11 Aug 2026** — Cambridge June-series results, 06:00 GMT. Two weeks away.
  Your single most-read page is already
  `/blog/cambridge-may-june-2026-grade-thresholds-what-to-expect` (40 sessions),
  and 6 of your top 20 posts are grade-boundary pages. Demand is arriving.
- **Sept–Oct** — new school year, new cohort choosing tools. Highest-intent
  signup window of the year.
- **Nov–Dec** — **mock season. This is when marking is actually used**, and the
  single best month to convert to paid.
- **Feb–May 2027** — final revision run-up, peak marking volume.

The strategic consequence: **July–August is a list-building season, not a
selling season.** Nobody marks past papers in the summer holiday. Results-day
traffic is huge and low-intent for marking. Capture it, then convert it in
November when mocks land. Trying to sell subscriptions on 11 August wastes the
moment; trying to sell in November to an email list you built in August is the
whole game.

---

## 5. The plan

### Phase 0 — Fix the leaks (this week, before 11 Aug)

Nothing here is a marketing task; all of it is why marketing doesn't work yet.

1. **Un-invert the ladder.** Guest: **1 free mark**, full Examiner's Ink, no
   account. Then a wall. Signed-in free: **5/month**. Paid: as-is. The guest
   mark is the taste; the account is the save. (`ANON_DAILY_MARK_LIMIT: 10 → 1`,
   day → lifetime-ish per IP.) Expect guest mark volume to drop and signups to
   rise — that is the trade you want.
2. ~~**Bring back the reverse trial:** 7 days of Scholar on signup, no card.~~
   **Done 2026-07-28, reversed 2026-08-07.** Both the reverse trial and the
   Scholar/Max checkout trial are now removed; there is no trial in the product.
   Access is paid or free. See `20260807_remove_trials.sql`.
3. **Rewrite the hero to lead with typing.** "Type or photograph your answer —
   marked against the real mark scheme, in your margins." One line, and it
   unblocks every desktop visitor.
4. **Route the blog to the product.** 322 blog sessions → 18 reached `/mark`
   (5.6%). Put a real inline CTA mid-article — not a footer link — carrying the
   subject: *"Mark a 9700 question against the real scheme — free, no account."*
   Target 15%.
5. **Fix attribution.** Send `document.referrer` and UTM params into
   `/api/track`. Without this, Phase 2 is unjudgeable.
6. **Turn on the emails you already built.** `WEEKLY_REPORT_SEND=true` +
   `MAX_LIFECYCLE_EMAIL_SEND=true` (vault tour ~24h + day-4 Max coach) +
   `RESEND_API_KEY`. The weekly examiner report and streak nudge are written and
   dark.
7. **Start collecting proof.** `mark_feedback` has 0 rows; the testimonial
   pipeline and `/admin/testimonials` exist. Ask after every mark, and put the
   first three real quotes on the landing page.

### Phase 1 — Own results season (11 Aug – 15 Sept)

Goal: **1,500 email subscribers**, not revenue.

- **Results-day hub** at `/results-2026`, live 9 Aug: countdown, grade-boundary
  tables per syllabus, "what your UMS means", remark/retake deadlines. Link
  every existing boundary post into it (they already rank).
- **The one thing to build:** *"Will my grade hold?"* — paste a raw mark, get
  the boundary, get the gap. It is a link magnet, it is genuinely useful on
  11 Aug, and it captures an email for the follow-up.
- **Email capture with an honest promise:** "We'll send you the November mock
  pack." That is the November conversion list.
- **Barnacle plays on results day** — you already have
  `docs/REDDIT_BARNACLE_COMMENTS.md` and `docs/BARNACLE_SEO_PLAYBOOK.md`. r/IBO,
  r/alevel, r/igcse, the official IB Discord (53k). Answer boundary questions
  with the tool, don't spam the link.
- **Retake/remark angle**: students who miss a grade on 11 Aug are the highest
  intent buyers of the year, and they are buying in *September*, not November.

### Phase 2 — Channels that beat domain age (Sept – Dec)

Your domain is ~3 months old and sits in Google's trust window; SEO rankings are
suppressed regardless of content quality. Do not write more blog posts — you
have 445. These channels don't care about domain age:

1. **TikTok / Reels, 4×/week.** The format is not "here's my app" — it is
   *"I marked a real 9700 essay and the examiner ink caught this."* Show the
   annotation landing on the script. RevisionDojo grew on exactly this. This is
   your highest-ceiling channel and the only one immune to domain age.
2. **The teacher wedge.** RevisionDojo gives schools free bulk grading to
   land accounts. You have `classrooms`, `classroom_memberships`,
   `teacher_overrides`, and `/for-teachers` already built. One teacher = 30
   students at zero CAC. Offer free classroom marking for one term to 20 IB/
   Cambridge teachers by direct email. This is the highest-leverage,
   lowest-spend motion available to you.
3. **Community UGC.** 446 seeded questions, 27 sessions/14d — it is live but
   dead. Seed 10 real answers a week during mock season; each becomes an
   indexable long-tail page and a reason to return.
4. **Reddit/Discord presence, sustained** — not launch spam. Be the person who
   answers "how many marks does this get?" with a real marked script.

### Phase 3 — Convert in mock season (Nov – Dec)

The list you built in August meets the moment it was built for. Mock-season
campaign to the email list, the reverse trial running on every new signup, the
weekly examiner report doing retention. This is the month you find out whether
the product converts. Everything before it is setup.

---

## 6. Pricing recommendation

**Collapse three tiers to two.**

| Tier | Now | Recommended |
|---|---|---|
| Guest | 10/day | 1 mark, full ink |
| Free | 5/month | 5/month + 7-day Scholar reverse trial |
| **Pro** | $11 / 50 | **$14.99/mo or $119/yr — 60 marks + the whole coach** (verify pass, rewrite, drills, trajectory, weekly report, Omni memory) |
| **Max** | $35 / 250 | **$29/mo — 250 marks**, for the genuinely heavy user and the tutor |
| Scholar | $19.99 / 120 | **retire** — it is the middle option nobody needs, and it's the only tier you've ever sold, which tells you the *positioning* worked, not the price |
| Credits | $10/25, $30/100, $100/500 | keep — pay-as-you-go is the right shape for exam-season spikes |

Rationale: one paid tier that clearly means "the coach, not just the marks" is a
decision a 17-year-old can make in ten seconds. $14.99 sits under RevisionDojo's
$17 Plus while including grading, which they charge $19 for. Annual at $119 is
the number to push in September — it covers the whole exam year and it front-
loads cash you need for Phase 2.

**Revenue arithmetic** (so the targets aren't wishful):

```
sessions/mo × session→signup × signup→first-mark × activated→paid = new subs/mo

today:   1,700 × 4.7% × 7%  × ~0%  ≈ 0/mo      → $20 MRR
Phase 0: 1,700 × 5%   × 35% × 8%   ≈ 2.4/mo    → the mechanics work
Phase 2: 10,000 × 5%  × 35% × 8%   ≈ 14/mo     → ~$210 MRR added per month
```

$1,000 MRR needs roughly **67 Pro subscribers**, which needs **~10,000
sessions/month with the funnel fixed** — reachable by Nov–Dec via TikTok +
results-season SEO compounding + teacher classrooms, and *not* reachable by
writing more posts. Signup→first-mark (7% → 35%) is the single highest-leverage
number in the model: it is worth more than a 5× traffic increase.

---

## 7. Weekly scorecard

Run this every Monday. Five numbers; if the middle one isn't moving, nothing
else matters.

```sql
-- 1. Traffic and shape
select count(distinct session_id) sessions,
       count(distinct session_id) filter (where path like '/mark%') on_mark,
       count(distinct session_id) filter (where path = '/pricing') on_pricing
from page_events where created_at > now() - interval '7 days';

-- 2. Signups
select count(*) from user_profiles where created_at > now() - interval '7 days';

-- 3. ACTIVATION — the number that decides everything
select count(distinct coalesce(user_id::text, id::text)) markers,
       count(*) runs,
       count(*) filter (where status = 'success') ok,
       count(*) filter (where page_count = 0 and not has_pdf) typed
from mark_runs where started_at > now() - interval '7 days';

-- 4. Money
select tier, status, count(*) from user_subscriptions
where tier <> 'free' group by 1,2;

-- 5. Proof (feeds the landing page)
select count(*), avg((fair)::int) from mark_feedback
where created_at > now() - interval '7 days';
```

Targets by 30 Nov 2026: 10,000 sessions/mo · 400 signups/mo · 140 activated
users/mo · 60+ paid · 25 testimonials.

---

## 8. What not to do

- **Don't write more blog posts.** 445 exist, ~3,000 indexable pages exist. The
  constraint is domain trust and funnel mechanics, not content volume.
- **Don't buy ads yet.** With attribution broken and the quota ladder inverted,
  every pound is unmeasurable and lands on a funnel that monetises nothing.
- **Don't gate the Examiner's Ink breakdown.** It is the hook and the
  differentiator. Premium adds depth; it never removes free's.
- **Don't launch on Product Hunt / HN.** Wrong audience entirely — your buyer is
  a 17-year-old on TikTok and their teacher on email.
- **Don't chase IB model answers until the data gap closes.** `mark_schemes` is
  100% Cambridge, 0 IB rows. IB is 39% of your traffic and your drills return
  nothing for it — Slice C's generated questions patch this, but official IB
  scheme data is still the missing asset.
