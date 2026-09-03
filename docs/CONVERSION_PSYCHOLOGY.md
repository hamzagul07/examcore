# The Conversion Psychology Playbook — MarkScheme

Companion to `GROWTH_PLAN_2026H2.md`. That doc is *where the students come from*.
This one is *why they pay*. Written 2026-07-28.

Every lever below is mapped to a surface that already exists in this codebase,
with the copy to put on it.

---

## 0. The asset nobody else has

Most edtech sells access to content. Content has no psychological weight — a
student can always find another PDF, and they know it. Cancelling costs nothing
because nothing was theirs.

You sell something structurally different: **a student's own handwriting with
examiner ink on it.** That artefact is:

- **theirs** (they wrote it) → endowment effect
- **made by their effort** (they sat and did the paper) → IKEA effect
- **not reproducible elsewhere** (no competitor holds their script history)
- **evidence about themselves**, which is the thing an anxious 17-year-old wants
  more than any feature

Research backs the size of this: the endowment effect makes people value a thing
they possess ~2.25× what they'd pay to acquire it, which is why free trials
convert 2–5× better than freemium — users experience *losing* rather than
*gaining*. Your entire monetisation strategy should be built on that one
sentence, and almost none of it is today.

**The strategic reframe:** stop selling "more marks per month." Quotas are a
gain-frame — the student evaluates whether 50 marks is worth $11 and mostly
concludes no. Start selling *continuity of a record they built*. That is a
loss-frame, and loss frames convert roughly twice as hard.

---

## 1. The reverse trial — the single highest-value change

The measured spread (2026 benchmarks, ~84k trials):

| Model | Free → paid |
|---|---|
| Opt-out trial (card required) | 60.4% |
| **Reverse trial** | **38.4%** |
| Opt-in trial (no card) | 25.2% |
| **Freemium** (what you run now) | **4.7% of MAU** |

Even the conservative readings put reverse trials at 18–32%, or 8–12% for
"great." You are running the 4.7% model with the 0% outcome, because your free
tier is 5 marks/month and your paid product has never been seen by a single
user.

**Give every new signup 7 days of Scholar, no card.** The code path is still
there — `effectiveAccess()` in `lib/billing/access.ts` already resolves
`trial_ends_at` to `'trial'`, and `trialDaysLeft()` exists.

> **Superseded 2026-08-07.** Both trials were removed (`20260807_remove_trials.sql`).
> The reverse trial ran from 2026-07-28 to 2026-08-07 and reached 47 concurrent
> trial accounts against 2 paying subscribers. `effectiveAccess` no longer has a
> `'trial'` level, `trialDaysLeft()` and `trial-summary.ts` are deleted, and
> `trial_ends_at` is dropped. The argument below is kept because the reasoning
> about endowment still applies to whatever replaces it — but the code it points
> at is gone, and this is the second reversal of the same mechanism
> (removed 2026-07-05, restored 2026-07-28, removed again 2026-08-07).

But the mechanism only fires if the trial **manufactures endowment**. A trial
where the student reads about features and then loses them is a gain-frame with
extra steps. A trial where the student *builds a record* and then watches it go
quiet is loss aversion. So the trial's job is not "show features" — it is
**"generate artefacts."** Specifically, in seven days the student must end up
owning:

1. ≥3 marked scripts with ink in the margins
2. a target grade (`user_profiles.target_grade`)
3. a weak-topic map (`lib/mastery.ts`)
4. one weekly examiner report in their inbox (`lib/reports/weekly-report.ts`)

Then day 8 is not a feature removal. It's a **dormancy notice on something they
made.**

### The downgrade screen — the highest-stakes copy in the product

Do **not** delete anything. Do not hide their marks. Show what goes quiet:

> **Your trial ended. Everything you marked is still here.**
>
> 6 scripts marked · 47 marks earned · weakest: Osmosis & Water Potential (41%)
>
> What pauses today:
> — Your examiner's report stops arriving on Sundays
> — Osmosis stays on the list; the drills that fix it stop being generated
> — Second-opinion verify goes back to the first 3 questions
>
> You're **9 marks from your target grade 6**. Keep the coach for $14.99/mo.
>
> [Keep my coach] [Stay on free — my 6 scripts stay saved]

Three things that copy does deliberately: it names the artefacts by number, it
states the gap to *their own stated goal*, and it makes the decline option
honest and non-punishing. That last one matters more than it looks — an escape
hatch that doesn't shame the student is what keeps the parent from charging
back, and it raises conversion rather than lowering it, because the ask reads as
confident instead of desperate.

---

## 2. Manufacture the effort (IKEA effect) in the first 72 hours

**0 of your 105 users have set a target grade.** That is the most damning single
number in your database, because `target_grade` is the input that powers the
trajectory card, `gapToTargetGrade`, the weekly report, and Omni's student
memory. Every premium feature you shipped is starved of the one field nobody
fills in.

Fix it by making the setup *feel like construction, not a form*. In onboarding,
ask three questions and then hand back something they own:

1. "What are you sitting, and when?" → subjects + exam date
2. "What grade do you need?" → `target_grade`
3. "What's the topic you dread?" → seeds the weak-topic map

Then render **"Your route to a 7"** — a real artefact with their subjects, their
exam countdown, their gap. It took them 40 seconds to build and now it exists
with their name on it. Every hour of labour they invest raises perceived value
of the thing that holds it, which is the whole IKEA-effect finding.

The compounding version: **every mark adds a brick.** After each script, the
weak-topic map gets more accurate. By mark 10 the student isn't subscribing to a
marking tool — they're subscribing to *the only place that knows what they keep
getting wrong.* That is a switching cost built entirely out of their own effort,
and it's honest, because it's genuinely true.

---

## 3. Loss aversion, the honest version

Duolingo monetises loss aversion directly: streaks, Streak Freeze bought with
gems bought with dollars. Q1 2026, 12.5m paid subscribers; streak wagers lift
day-14 retention 14%. It works. It is also the version of this mechanic that
gets criticised, because the thing at risk (a number) is manufactured by the app
purely so it can be threatened.

You have a better version available, because **the thing at risk is real.**
Your `GuestConversionPrompt` already nails the tone:

> "You scored 12/20 — but this mark isn't saved anywhere. Close the tab and it's
> gone."

That is true, it is specific, and it names a genuine consequence. Extend that
exact register everywhere:

| Moment | The real loss to name | Where |
|---|---|---|
| Guest finishes mark 1 | The script vanishes on tab close | `GuestConversionPrompt` ✅ built |
| Free user hits 5/5 | "Your Sunday report needs 3 more marks to say anything useful" | `MarkUsageIndicator` |
| Trial day 5 | "Osmosis is down to 41%. Two more drills and the map's worth reading." | in-app + email |
| Trial ends | Dormancy, not deletion (§1) | new screen |
| 14 days idle | `lib/streaks/nudge.ts` — but nudge the *gap*, not a streak count | already built |

**The line to hold:** name losses that would exist whether or not you had a
business model. Never invent a loss to sell its prevention. A streak counter you
created so you can sell a freeze is the manufactured kind; "your weak-topic map
goes stale if you stop marking" is the real kind — and it's more persuasive to a
teenager, who has excellent radar for being played.

---

## 4. Goal gradient — your strongest and most underused asset

Effort accelerates as a goal gets visibly closer. You have already built the
mechanics and are barely using them:

- `marksToNextGrade()` in `lib/grade-boundaries.ts` → *"N marks from an A*"*
- `gapToTargetGrade()` in `lib/target-grade.ts` → % to the target boundary
- `examCountdown` → days to the real paper
- `GradeTrajectory` card → currently Cambridge-only, premium

**The conversion architecture writes itself:**

> **Free shows the gap. Paid shows the route.**

Every student sees "You're 9 marks off a grade 6, and Paper 1 is in 37 days."
That number is a wound and an anchor at once — Zeigarnik: an unfinished, *named*
goal stays live in the mind in a way a vague one doesn't. Then the ask is the
answer to the question it just created:

> "Those 9 marks are in three topics. Here's the first drill." → paid

This is the cleanest possible upgrade prompt because the student's own data
generated it, the goal is one they typed in themselves, and the deadline is real.
Note the IB gap: `GradeTrajectory` is Cambridge-only, and IB is **39% of your
traffic**. IB students get no trajectory at all. Building the IB equivalent (1–7
band distance) is probably the highest-ROI premium work available.

---

## 5. Real scarcity beats fake scarcity — and you're sitting on it

Fabricated urgency ("offer ends in 2 hours!", a timer that resets on refresh) is
both the most-enforced dark pattern and, for this audience, the least effective:
teenagers have seen ten thousand of them.

You have genuine, verifiable, recurring deadlines that no competitor can fake:

- **11 Aug 2026** — Cambridge results
- Mock season, Nov–Dec
- May 2027 papers
- `examCountdown` — that student's actual paper, N days out

Urgency copy that is simply true:

> "Paper 1 is in 37 days. You've marked 4 questions."
> "Mocks start in 3 weeks. Your weakest topic hasn't moved since October."

That converts, and it never expires as a tactic, and it can't get you fined.

**Seasonal pricing has an honest form too:** an exam-year annual plan sold in
September is not a manufactured deadline — the exam year genuinely starts then.
Push $119/year in September, not $14.99/month.

---

## 6. Place the ask at the peak, not in the navbar

Peak–end rule: people judge an experience by its most intense moment and its
end. In your product both of those are the **mark reveal** — the ~5s cinematic
reveal was already a deliberate premium-feel decision, and it's the only moment
in the whole funnel with genuine emotional charge.

So: **the upgrade ask belongs immediately after the ink lands, and nowhere
else.** Not the navbar, not a banner, not an interstitial before value. The
research on paywall timing is split — upfront pricing can convert 5–6× on
impulse categories — but the consistent finding is that the highest-converting
paywalls fire *shortly after the aha moment*. Your aha moment is unambiguous and
measurable: **the first completed mark.** `mark_runs.status = 'success'`.

Two emotional branches, and the copy must differ:

**They did badly** (highest need, highest risk of harm):
> "You lost 6 marks — all of them on 'explain' commands. That's a pattern, not
> bad luck, and it's fixable. Here's the drill." → **corrective and specific.**
> Never *"you're on track to fail"* — that's exploiting exam anxiety in a
> demographic with a real mental-health baseline, it's the copy most likely to
> trigger a parent complaint, and it converts worse than the specific version
> because it's unfalsifiable and reads as a sales pitch.

**They did well** (under-used, no anxiety cost):
> "18/20 — that's grade-6 work. Two more like that and your predicted grade
> moves. Keep the streak honest: your report goes out Sunday."

Note what's gated. Per the additive-only rule, the ink breakdown stays free
forever — it *is* the aha moment, and gating it would remove the very experience
that makes anyone want the paid product. Gate the **route**: drills, verify on
the full script, rewrite-to-full-marks, the Sunday report, Omni with memory.

---

## 7. Social proof — you have zero, and it's the whole trust decision

`mark_feedback`: **0 rows.** `LandingProof` renders nothing. In a category whose
central objection is *"is this actually marking like a real examiner or is it
just ChatGPT?"*, you are presenting no evidence whatsoever.

The temptation is fabricated proof — invented testimonials, "2,847 students
marked today." Don't: it's straightforwardly illegal advertising in both the US
and UK, one screenshot ends the brand with a teenage audience that screenshots
everything, and you don't need it, because you can generate the real thing in
two weeks:

1. Turn on the feedback ask after every mark (`MarkFeedbackPrompt` — built).
2. Publish the aggregate as **original research**: *"We marked 1,000 Cambridge
   answers. Students said the mark was fair 89% of the time. Here's where we
   were wrong."* Publishing your error rate is a trust move no competitor will
   copy, it's a genuine backlink asset, and it's the exact objection-killer.
3. Three real quotes with subject + grade on the landing page beats thirty
   invented ones.

Then the honest scarcity of proof works *for* you: "89% fair, measured across
1,000 marks" is checkable, and checkable claims are what a sceptical 17-year-old
forwards to a friend.

---

## 8. The buyer is often not the user

A 16–18 year old usually cannot complete a card payment without a parent. Your
current funnel has no parent in it at all. This is likely costing you more than
any copy change.

Two moves:

**a) Build the artefact the student shows their parent.** A one-page shareable
report: subjects, target grade, gap, weak topics, marks completed. The student
sends it; the parent sees evidence of effort — the single thing a parent most
wants to see — and the ask arrives with proof attached. This is a *different
funnel*, and it converts on a completely different emotion (parental relief,
not student anxiety).

**b) Frame price against the alternative the parent is already pricing.** A
tutor is £30–50/hour. That comparison is true, verifiable, and enormous:

> "A tutor marks one essay an hour, for £40. This marks every question you write
> all year, for £119."

Per-week framing works on the student ("less than a coffee a week"); the
tutor-hour anchor works on the parent. Use both, on different surfaces.

---

## 9. Pricing psychology

From `GROWTH_PLAN_2026H2.md` §6, with the psychology made explicit:

| Tier | Price | Psychological job |
|---|---|---|
| Guest | 1 mark, full ink | **The taste.** Creates the endowment object. |
| Free | 5/month + 7-day Scholar trial | Where the trial lands them. Non-punishing. |
| **Pro** | **$14.99/mo · $119/yr** | The target. Named "the coach," not "more marks." |
| Max | $29/mo | **Decoy/anchor.** Makes Pro read as obvious rather than as the cheap option. |
| Credits | $10 / $30 / $100 | For the exam-week spike. Also converts the commitment-averse. |

Three notes that matter more than the numbers:

- **Anchor the annual against the year, not the month.** "£119 for the whole
  exam year" is one decision; "$14.99 × 12" is twelve chances to cancel.
- **Retire Scholar.** A three-way choice creates decision paralysis in a buyer
  who has never bought software before. Two options and an anchor.
- **The one sub you've sold was Scholar** — the middle. That tells you the
  *positioning* landed, not that the price did. Pro at $14.99 with the full
  coach is that same value story at a price a student can defend to a parent.

---

## 10. The trigger map — moment → emotion → ask

Build this as the actual notification/prompt spec.

| # | Moment (event) | Emotion | Ask | Surface |
|---|---|---|---|---|
| 1 | Guest completes mark 1 | Surprise at the ink | "This isn't saved anywhere" | `GuestConversionPrompt` ✅ |
| 2 | Signup complete | Optimism | Set target grade + exam date → *"Your route to a 7"* | onboarding |
| 3 | Trial mark 1 success | Relief / sting | Drill the weak spot | `WeakSpotDrillCard` ✅ |
| 4 | Trial day 3 | Momentum | "Two more marks and your map is real" | email |
| 5 | Trial day 6 | Anticipated loss | Preview the dormancy screen *before* it fires | in-app |
| 6 | **Trial day 8** | **Loss** | **The conversion event** (§1) | new screen |
| 7 | Free user hits 5/5 | Blocked mid-flow | "Your report needs 3 more marks" | `MarkUsageIndicator` ✅ |
| 8 | Gap to target ≤ 10 marks | Goal gradient | "9 marks. Three topics. Start here." | `GradeTrajectory` ✅ (Cambridge only — build IB) |
| 9 | 14 days idle, exam < 60 days | Guilt (mild, honest) | "Your weakest topic hasn't moved" | `lib/streaks/nudge.ts` ✅ |
| 10 | Mock season begins (Nov) | Panic, seasonal | Annual plan, exam-year framing | email to the August list |

Most of column 4 already exists in the codebase. What's missing is **6** (the
downgrade screen), **2** (target grade in onboarding), and the IB half of **8**.

---

## 11. The line, and why it's a business argument

Not building: fake countdown timers, invented purchase counts or testimonials,
"you will fail without this" copy, pre-ticked upsells, cancellation flows harder
than signup, or auto-renew that isn't stated plainly before the card is taken.

The reasons are practical, not moral posturing:

- **Your buyer is a minor.** The FTC is escalating on exactly this intersection
  in 2026 — negative-option/subscription dark patterns and services directed at
  minors, enforced under FTC Act §5 and COPPA. Click-to-cancel was vacated on
  procedure in 2025; the enforcement posture wasn't.
- **You're on a Merchant of Record.** Polar carries your payment risk. Disputed
  charges from parents ("my child signed up for what?") are the fastest way to
  lose a MoR account, and losing it takes the whole business offline.
- **This audience screenshots.** One fake-scarcity timer posted to r/IBO with
  "lol this app fakes urgency" undoes six months of trust-building in a market
  where trust *is* the product.
- **It converts worse where it counts.** Manipulated signups churn in month one
  and refund. Endowment-driven signups renew — because the thing they'd lose
  keeps getting more valuable the longer they stay.

The honest levers here are not the weaker option. Loss aversion on a real record,
a real deadline, a real gap to a goal the student set themselves, and real
published accuracy data — that's a stronger stack than any dark pattern, and it
still works in year three.

---

## 12. Build order

1. ✅ **Reverse trial + downgrade screen** (§1) — the 4.7% → 38% lever
2. ✅ **Target grade in onboarding** (§2) — unblocks every premium feature you
   already shipped; was 0/105 users
3. ✅ **Un-invert the quota ladder** (Growth Plan §2.1) — without this, none of the
   above can work
4. ✅ **Post-mark ask at the peak** (§6) — `MarkingResultView`
5. **Feedback collection on** (§7) — ⏳ the ask ships (#65) and is collecting,
   but n=2. Steps 2 and 3 (publish the aggregate, three real quotes) need
   volume that does not exist until activation moves.
6. **IB trajectory** (§4) — 39% of traffic currently has no goal gradient
7. ✅ **Parent-shareable report** (§8) — shipped 2026-09-03, see below

### Shipped 2026-09-03 — activation, then the parent funnel

Built against the 29 Aug production read (`docs/` has no copy of it; the numbers
below are quoted where the code depends on them). The finding that ordered the
work: the paywall has fired ~once since May, and the upgrade pitch is shown 22×
more often than a mark result is seen — so nothing about the *offer* could have
been the constraint.

- **The answer box moved to the question.** `components/seo/TopicQuestionAnswer.tsx`
  on both topic-page families — Cambridge `/past-papers/[code]/[topic]` and the
  IB twin `/ib/past-papers/[slug]/[topic]`. 1,891 sessions landed on a product
  surface in 30 days and 86 began an answer; the drop was the navigation, not
  the marker. The answer travels in sessionStorage
  (`lib/marking/practice-answer.ts`); the question deliberately does not.
- **`withTotalMarks`** carries the question's mark total into the deep link.
  "We could not read the total marks from your question" was 11 of 17 recorded
  mark failures, and it fires only *after* the student has waited.
- **The quota ladder un-inverted.** `ANON_DAILY_OMNI_LIMIT` 60 → 5. A guest was
  getting ~1,800 study-chat messages a month against a free account's 10 — a
  180× downgrade for signing up, and 6× what a $35 Max subscriber gets.
- **`/pricing#credits` exists.** Five components linked to that anchor,
  including the secondary button inside the paywall modal; it was nowhere in the
  codebase, so every "Top up credits" button scrolled to the top of the page.
  The packs were fully built server-side the whole time.
- **The parent report** — this item. `lib/reports/parent-report.ts` (pure,
  tested) → `/p/[token]`, a signed link the student generates from
  `/dashboard/progress`. It leads with effort (questions marked, active days)
  and only then shows target, gap and weak topics. It contains no answers, no
  examiner comments and no individual scores, because a report that can
  embarrass its subject does not get shared. New funnel events
  `parent_report_shared` / `parent_report_viewed`; the ratio between them is
  the test of whether students actually send it.

### Shipped 2026-07-28

> **Everything trial-related in this section was removed on 2026-08-07.** The
> files below (`trial-summary.ts`, `TrialSummaryPanel.tsx`, the trial-end email
> and cron) are deleted, and the copy described in the last bullet was rewritten
> a second time to say no trial exists. Kept as a record of what was tried.
> `ANON_DAILY_MARK_LIMIT` 10 → 1 still stands.

- `supabase/migrations/20260728_restore_reverse_trial.sql` — restores the
  `trial_ends_at` column default that grants the trial. **Reverted 2026-08-07**
  by `20260807_remove_trials.sql`, which drops the column outright.
- `lib/billing/trial-summary.ts` + `lib/billing/trial-summary.test.ts` — the
  artefact count (scripts marked, marks earned, weakest topic, gap to target),
  scoped to work done *inside* the trial window so the number is honest.
- `components/billing/TrialSummaryPanel.tsx` — the day-6 preview and the
  post-expiry dormancy notice, wired into the dashboard above the billing
  banner. Third variant for students who marked nothing: points them back at
  the product instead of asking them to buy something they never used.
- `ANON_DAILY_MARK_LIMIT` 10 → 1, with the cap message rewritten to sell the
  account at the moment the mark is on screen.
- Trial copy restored across terms, refunds, FAQ, pricing FAQ, blog CTA, blog
  index and SEO descriptions — all of which had been rewritten to say no trial
  exists.

### Shipped 2026-07-28, part 2

- **Target grade in onboarding** — step 3, beside the exam date, so the wizard
  stays five steps. Validated server-side against the student's own board:
  Cambridge (A*–E) and IB (1–7) are disjoint scales, and a Cambridge grade on an
  IB profile does not error — `gapToTargetGrade` misses in `GRADE_BOUNDARIES`
  and returns null forever, so the student sees no gap and never learns why.
- **Post-mark ask** (`lib/marking/post-mark-ask.ts`) — the free rewrite teaser
  now leads with the student's own diagnosis instead of the feature name:
  *"You lost 4 marks — 3 of them to incomplete working."* Two guardrails are in
  the code, not just the copy review: a pattern is named only when one
  classification covers ≥2 lost marks **and** ≥half the classifiable ones (one
  slip is not a trend, and inventing one from n=1 is how you get caught), and
  every corrective line states what the student did *right* before what they
  lost. A test asserts the generated strings never contain fail/behind/poor
  language at any score.

**Resolved:** the trial cap. `capForAccess()` gives the trial 25 marks rather
than Scholar's 120 — the trial borrows Scholar's features but not its volume,
because 120 marks at 3–4 Gemini Pro calls each, on a cardless account, is an
unbounded bill. Still 5× the free tier.

**Still open:** whether to grant a retroactive trial to the 129 existing free
accounts. The SQL sits in the migration as a comment, deliberately unexecuted —
it is a re-engagement campaign, not a schema change, and running it silently
means the trial starts and expires while nobody is looking. It should ship with
an email.
