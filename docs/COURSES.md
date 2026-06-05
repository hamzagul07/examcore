# Free courses — traffic & learning funnel

Production: **https://markscheme.app/courses**

## Strategy

Students search **“free A Level course”**, **“ZNotes alternative”**, and **“{subject} notes free”**. MarkScheme’s edge is not copying note sites — it is **syllabus-aligned topic lessons** that funnel into **past-paper marking** on `/mark`.

| Goal | Implementation |
|------|----------------|
| Capture SEO traffic | `/courses`, `/courses/{code}`, `/courses/{code}/{topic-slug}` |
| Topic coverage | Auto-built from `lib/syllabi/*.json` + `lib/syllabus.ts` (9709) |
| Full lessons | `content/courses/{code}/{slug}.json` overrides outlines |
| Progress | `localStorage` on device (cloud sync later) |
| Monetisation | Free courses → free marking tier → paid mastery |

## Do NOT scrape ZNotes

ZNotes, Save My Exams notes, Physics & Maths Tutor sheets, etc. are **copyrighted**. Scraping and republishing risks:

- DMCA / takedowns  
- Google “scraped content” demotion  
- Brand damage  

**Instead:**

1. Use **official Cambridge syllabus trees** already in the repo.  
2. Generate **original** lessons with Claude (`scripts/generate-course-lesson.mjs`).  
3. Generate **diagrams** with Gemini → `public/courses/diagrams/`.  
4. Link to **official** Cambridge past papers + your blog guides.  
5. Optional: link *out* to ZNotes as “external resource” without copying body text.

## Content tiers

| Status | What students see |
|--------|-------------------|
| `outline` | Syllabus point, exam tips, links to mark + blog (auto from syllabus) |
| `published` | Full lesson JSON: intro, formulas, worked examples, practice CTA |

## Adding a full lesson

1. Pick syllabus code + topic, e.g. `9709` + `1.7`.  
2. Run `node scripts/generate-course-lesson.mjs --code 9709 --topic 1.7` (with `ANTHROPIC_API_KEY`).  
3. Review JSON → save to `content/courses/9709/1-7-differentiation.json`.  
4. Deploy. Lesson page updates automatically.

Manual authoring is fine — copy structure from existing `content/courses/9709/*.json`.

## Diagrams (Gemini)

Prompt template:

> Educational diagram for Cambridge {level} {subject}: {topic}. Clean flat style, labels readable, white background, no watermark. For students revising for exams.

Save as `public/courses/diagrams/{code}-{slug}.png` and add to lesson JSON:

```json
"diagram": { "src": "/courses/diagrams/9709-1-7-differentiation.png", "alt": "..." }
```

## SEO

- Index `/courses` and all subject + lesson URLs (in `app/sitemap.ts`).  
- Target keywords: `free {code} course`, `free A Level {subject} notes`, `{topic} revision 9709`.  
- Internal link from blog posts and `/subjects/{code}` to `/courses/{code}`.

## Premium lesson features (live)

| Feature | Where |
|---------|--------|
| Learning objectives | Top of lesson |
| “Explain simpler” toggle | Below main content |
| Real past-paper questions | Fetched from `mark_schemes` by `syllabus_tags` |
| FAQ accordion + JSON-LD | Bottom of lesson (SEO) |
| Progress bar | Sidebar (localStorage) |
| Course schema | `CourseLessonJsonLd` |

## Batch generate (Claude)

```bash
pnpm course:generate -- --code 9702
pnpm course:generate -- --code 9702 --topic 9.1
pnpm course:generate -- --code 9702 --limit 10 --force
```

Requires `ANTHROPIC_API_KEY` in `.env.local`.

## Roadmap

- [ ] Finish premium lessons for all 9702 / 9700 / 9701 topics  
- [ ] Supabase `course_progress` for signed-in users  
- [ ] “Continue course” on dashboard  
- [ ] Gemini diagrams per topic → `public/courses/diagrams/`
