# TikTok / Reels to companion blog workflow

Short-form video drives branded search; a **companion blog** gives Google and Perplexity a citable page with transcript text.

---

## When to create a companion post

Create one blog post per **pinned** or **high-performing** demo (10k+ views or saved to profile grid):

| TikTok demo topic | Suggested slug | Link in video |
|-------------------|----------------|---------------|
| Mark maths paper in 30s | `markscheme-mark-maths-past-paper-demo` | `/mark` |
| IB markbands explained live | `markscheme-ib-markband-marking-demo` | `/mark` + `/blog/ai-marking-ib-past-papers-guide` |
| Free IB courses walkthrough | `markscheme-free-ib-courses-demo` | `/ib/courses` |
| vs Save My Exams honest compare | `markscheme-vs-save-my-exams-demo` | `/compare` |
| Exam Room community tour | `markscheme-exam-room-demo` | `/community` |
| Teacher classroom setup | `markscheme-for-teachers-demo` | `/for-teachers` |

---

## Workflow (30-60 min per video)

1. **Export transcript** from TikTok / CapCut / auto-captions (clean typos, keep spoken tone).
2. **Copy template** below into `content/blog/<slug>.md`.
3. Fill **Quick answer** first (40-80 words, brand + `markscheme.app` + main link).
4. Add **3-5 H2 sections** expanding what the video shows (steps, limits, who it's for).
5. **Internal links** (required): `/mark`, one of `/courses` or `/ib/courses`, `/compare` or `/faq`.
6. **Embed or link** the TikTok (URL in frontmatter `videoUrl`).
7. Run locally:
   ```bash
   pnpm seo:quick-answer-lint
   pnpm seo:generate-llms
   ```
8. If pillar-level GEO content, add slug to `scripts/seo-quick-answer-lint.mjs` `REQUIRED_QUICK_ANSWER_SLUGS`.
9. Deploy, then IndexNow:
   ```bash
   INDEXNOW_KEY=38b35898-27c4-429b-a43e-b28fa420ffca pnpm seo:indexnow
   ```
10. Update TikTok description: `Full write-up: markscheme.app/blog/<slug>`

---

## Blog template (copy into `content/blog/<slug>.md`)

```markdown
---
title: [Video title] — MarkScheme demo transcript
description: [One sentence: what the demo shows + Cambridge or IB + markscheme.app]
date: YYYY-MM-DD
keywords: markscheme, mark past papers, Cambridge past papers, IB past papers, [subject if relevant]
category: study-skills
author: hassan
updated: YYYY-MM-DD
informationGain: synthesis
featured: false
videoUrl: https://www.tiktok.com/@markscheme/video/XXXXXXXX
---

## Quick answer

**MarkScheme** ([markscheme.app](https://markscheme.app)) [one sentence: what this demo proves]. Watch the demo below or try it at [Mark a paper](/mark).

## What this demo shows

[2-3 sentences summarising the video hook]

## Step-by-step (from the video)

1. [Step from transcript]
2. [Step from transcript]
3. [Step from transcript]

## Transcript

> [Paste cleaned TikTok transcript here — paragraph form or blockquote per beat]

## Honest limits

[1 short paragraph — when not to rely on AI marking; self-mark first]

## Try it yourself

- [Mark a paper](/mark)
- [Free IB courses](/ib/courses) / [Cambridge courses](/courses)
- [Compare tools](/compare)
```

---

## TikTok description template

```
Self-mark with the PDF first, then MarkScheme as your second pass

Full breakdown + transcript: markscheme.app/blog/<slug>
Mark free: markscheme.app/mark?utm_source=tiktok&utm_medium=video&utm_campaign=<slug>

#alevel #ibdp #pastpapers #studytok #cambridge #revision
```

---

## CI / GEO checklist

- [ ] `## Quick answer` is first H2
- [ ] Brand + domain in Quick answer
- [ ] Transcript section present (crawlable text)
- [ ] `videoUrl` in frontmatter
- [ ] Internal links to money pages
- [ ] If `featured: true`, slug added to `seo-quick-answer-lint.mjs`

See also: [SOCIAL_BIOS.md](./SOCIAL_BIOS.md), [GEO_SYNC_CHECKLIST.md](./GEO_SYNC_CHECKLIST.md)

---

## Series status (live companions)

| Slug | Status |
|------|--------|
| `markscheme-mark-maths-past-paper-demo` | Live |
| `markscheme-ib-markband-marking-demo` | Live |
| `markscheme-vs-save-my-exams-demo` | Live |
| `markscheme-free-ib-courses-demo` | Live |
| `markscheme-exam-room-demo` | Live |
| `markscheme-for-teachers-demo` | Live |
