# Results Day 2026 ops (11 Aug)

Direct / social / email first. Organic SEO is already wired; this week is
**distribution**. Success metric: organic or social → tool → mark → account → paid
later — not traffic alone.

Primary links (always use UTMs):

| Intent | URL |
|--------|-----|
| Hub | `https://markscheme.app/results-2026?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| Stress-test | `https://markscheme.app/tools/will-my-grade-hold?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| 9709 deep | `https://markscheme.app/tools/will-my-grade-hold?code=9709&utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| Boundaries hub | `https://markscheme.app/guides/grade-boundaries?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| Mark (after grade) | `https://markscheme.app/mark?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| **Edexcel IAL hub** | `https://markscheme.app/results-2026/edexcel?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| **Edexcel UMS guide** | `https://markscheme.app/blog/edexcel-ial-maths-grade-boundaries-ums-2026?utm_source=social&utm_medium=organic&utm_campaign=results-2026` |
| **Mark WMA11** | `https://markscheme.app/mark?board=edexcel&subject=WMA11&utm_source=social&utm_medium=organic&utm_campaign=results-2026` |

Swap `utm_source` / `utm_medium` per channel (`tiktok`, `instagram`, `email`,
`reddit` + `barnacle`). Email campaign: `utm_campaign=results-2026-email`.

**Do not** send Edexcel IAL students to Cambridge threshold calculators as the
primary CTA — use UMS / cash-in + `/mark?board=edexcel`.

---

## GSC Request Indexing (do today — ~10 URLs)

Paste into Search Console → URL Inspection → Request indexing. Priority = rewritten
CTR winners + conversion destinations:

1. `https://markscheme.app/guides/grade-boundaries`
2. `https://markscheme.app/tools/will-my-grade-hold`
3. `https://markscheme.app/results-2026`
4. `https://markscheme.app/blog/cambridge-results-day-august-2026-guide`
5. `https://markscheme.app/blog/cambridge-9709-mathematics-grade-boundaries-2026`
6. `https://markscheme.app/blog/cambridge-may-june-2026-grade-thresholds-what-to-expect`
7. `https://markscheme.app/tools/grade-boundary-calculator`
8. `https://markscheme.app/blog/cambridge-2281-o-level-economics-past-papers-guide`
9. `https://markscheme.app/tools/command-words`
10. `https://markscheme.app/ib/past-papers/chemistry-hl`

Full list: `node scripts/gsc-indexing-urls.mjs --tier 1`

---

## Sprint checklist

### Now → 10 Aug (pre-results)

- [ ] Pin Instagram / TikTok bio to **Will my grade hold?** (not bare `/mark`)
- [ ] Post 1× short: "boundaries aren't out yet — here's how to estimate without Telegram spreadsheets"
- [ ] Email list (if any): prep-day checklist → hub + tool
- [ ] Reddit: answer 2 boundary threads (templates below) — value first

### 11 Aug (A-Level results morning)

- [ ] 06:00–09:00 GMT: post "grades are out, thresholds ~13 Aug" + hub
- [ ] Pin: Will my grade hold? + Results Day hub
- [ ] Reply-only mode on Reddit/Discord — no cold spam
- [ ] Midday: remark / EAR angle for students who miss a band

### 12–13 Aug (threshold week)

- [ ] Post when Cambridge PDFs drop: calculator + will-my-grade-hold
- [ ] Subject-specific (9709 / 9700 / 9701 / 9702) one-liners
- [ ] Capture emails via mock-pack promise on the tool pages

### 18 Aug (IGCSE / O Level)

- [ ] Repeat hub pattern with IGCSE framing
- [ ] Link O-Level / IGCSE boundary posts from the hub

---

**Paste-ready pack for this week:** [READY_TO_POST_NOW.md](./READY_TO_POST_NOW.md)

## Social copy (customize lightly — do not paste identical text everywhere)

### A. Pre-results (9–10 Aug) — TikTok / Reels / Shorts caption

> Cambridge June grades: **11 Aug**. Threshold tables: **~13 Aug**.  
> Don't refresh Telegram spreadsheets. Paste your raw marks and see how sensitive your grade is if boundaries move.  
> Free tool: markscheme.app/tools/will-my-grade-hold  
> Full hub: markscheme.app/results-2026

**On-screen hook (first 2s):** "Your grade might survive a boundary shift — or not."

### B. Results morning (11 Aug) — Instagram / X

> AS & A Level grades are out (05:00 GMT). Component thresholds usually follow ~13 Aug.  
> Statement first. Then: will my grade hold if the PDF moves a mark either way?  
> → markscheme.app/results-2026  
> → markscheme.app/tools/will-my-grade-hold

### C. Missed-a-band (11 Aug afternoon)

> If you're one mark off: EAR / remark deadlines matter more than Discord theories.  
> Save your statement PDF. Map component codes. Then decide with evidence.  
> Checklist: markscheme.app/blog/cambridge-results-day-august-2026-guide  
> Hub: markscheme.app/results-2026

### D. Thresholds live (~13 Aug)

> June 2026 threshold tables are dropping. Official numbers only — not predictions.  
> Load your component in the calculator, or stress-test the gap:  
> markscheme.app/tools/grade-boundary-calculator  
> markscheme.app/tools/will-my-grade-hold

### E. 9709-specific (high GSC intent)

> Searching "9709 grade boundaries 2026"? Grades 11 Aug, component PDFs ~13 Aug.  
> Estimate with recent sessions + sensitivity check:  
> markscheme.app/tools/will-my-grade-hold?code=9709  
> Guide: markscheme.app/blog/cambridge-9709-mathematics-grade-boundaries-2026

### F. Edexcel IAL Maths (wrong-board rescue)

> Sitting Edexcel International, not Cambridge? Grades aren't a 9709 threshold table.  
> IAL Maths uses **UMS / cash-in** across units (WMA11…).  
> → markscheme.app/results-2026/edexcel  
> → markscheme.app/blog/edexcel-ial-maths-grade-boundaries-ums-2026  
> Practise the next unit: markscheme.app/mark?board=edexcel&subject=WMA11

**When to use F:** replies on threads mixing "Edexcel" + "grade boundaries",
or Cambridge posts where comments say "I'm on IAL / Pearson."

---

## Email (broadcast or Resend one-off)

**Subject options**
1. Cambridge results: 11 Aug — what to do before thresholds
2. Don't trust Telegram boundaries — stress-test your mark
3. Grades out. Thresholds next. Here's the calm checklist.

**Body**

```
Hi {{first_name}},

Cambridge AS & A Level grades for the June 2026 series land **11 August**
(05:00 GMT). Component grade threshold tables usually follow around **13 August**.

Do this instead of doom-scrolling:

1. Save your statement of results PDF (two copies).
2. Note syllabus + component codes.
3. Stress-test how close you are if thresholds move:
   https://markscheme.app/tools/will-my-grade-hold?utm_source=email&utm_medium=broadcast&utm_campaign=results-2026-email

Full hub (dates, remark windows, subject links):
https://markscheme.app/results-2026?utm_source=email&utm_medium=broadcast&utm_campaign=results-2026-email

Honest follow-up: if you want the November mock pack when marking actually
matters again, grab it on the tool page — one past-paper focus path per week,
no spam.

— Hamza
MarkScheme
```

---

## Reddit barnacles (Results Day variants)

Rules: same as [REDDIT_BARNACLE_COMMENTS.md](./REDDIT_BARNACLE_COMMENTS.md) —
customize each reply; never clone verbatim across threads.

UTM: `?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026`

### r/alevel — "when are grade boundaries / thresholds?"

> Grades on your statement are **11 Aug**; the per-component threshold PDFs for
> June usually land around **13 Aug**. Until then, recent sessions are a bracket
> not a prophecy. I use a sensitivity tool (paste raw mark → see if a 1–2 mark
> boundary shift flips the grade) so I'm not refreshing Telegram:
> https://markscheme.app/tools/will-my-grade-hold?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026
> Dates checklist: https://markscheme.app/results-2026?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026

### r/alevel — "9709 boundaries 2026"

> Official 9709 component rows aren't public until the threshold PDF. Estimate
> with June 2024/2023 in a calculator, then check how fragile the band is:
> https://markscheme.app/tools/will-my-grade-hold?code=9709&utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026
> Write-up: https://markscheme.app/blog/cambridge-9709-mathematics-grade-boundaries-2026?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026

### r/igcse — "results day when?"

> IGCSE / O Level grades for June 2026 are **18 August** (05:00 GMT); A Level
> was 11 Aug. Threshold tables for the series often appear mid-August before
> IGCSE release. Calm checklist:
> https://markscheme.app/blog/cambridge-results-day-august-2026-guide?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026
> Hub: https://markscheme.app/results-2026?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026

### r/alevel / intl — "Edexcel IAL grade boundaries / UMS"

> If you're on **Edexcel International A Level Maths**, don't paste Cambridge
> 9709 threshold tables onto a WMA unit. IAL is raw → **UMS** → cash-in.
> Short explainer:
> https://markscheme.app/blog/edexcel-ial-maths-grade-boundaries-ums-2026?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026
> Results hub: https://markscheme.app/results-2026/edexcel?utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026
> Practice mark (WMA11): https://markscheme.app/mark?board=edexcel&subject=WMA11&utm_source=reddit&utm_medium=barnacle&utm_campaign=results-2026

---

## Teacher / tutor one-liner (DM)

> Results week tip for your cohort: before Telegram thresholds, have them paste
> component raw marks into markscheme.app/tools/will-my-grade-hold — shows how
> sensitive the band is. Hub with dates: markscheme.app/results-2026. Free;
> November mock pack opt-in on the page if useful.

---

## After each post

1. Check GA4 (or your funnel events) for `results-2026` / `will-my-grade-hold` landings
2. Do **not** judge SEO rankings on 11 Aug alone
3. Log Reddit thread URLs in [OUTREACH_TRACKER.md](./OUTREACH_TRACKER.md)
4. Re-ping IndexNow only after on-site content changes:
   `INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow`
