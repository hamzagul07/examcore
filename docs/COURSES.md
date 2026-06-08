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

## Your notes → original lessons (recommended)

1. **Upload** your notes to `content/source-notes/{code}/` (see `content/source-notes/README.md`).  
   Example: `content/source-notes/9702/12.2.md` for topic 12.2.  
   This folder is **gitignored** — your files stay local.

2. **Generate** original premium lessons with Gemini (rewrites your notes; does not copy them):

```bash
pnpm course:from-notes -- --code 9702 --topic 12.2
pnpm course:from-notes -- --code 9702 --diagrams   # + Gemini diagram images
```

3. Output lands in `content/courses/{code}/{slug}.json` with **flashcards**, visual sections, FAQs.

4. Deploy — lesson pages update automatically.

### School PMT ingest (licensed use)

If your school may use PMT materials internally, download PDFs to a private folder and generate **original** lessons (not verbatim PMT text):

```bash
pnpm course:from-pmt -- --code 9702 --parent 12
pnpm course:from-pmt -- --code 9702 --topic 12.2 --generate --diagrams
```

See `content/source-notes/README.md`. Public attribution links only: `pnpm course:pmt-links -- --code 9702 --apply`.

## Do NOT scrape ZNotes

ZNotes, Save My Exams, etc. are **copyrighted**. Do not upload or scrape them.

**Instead:** your own summaries in `content/source-notes/`, or syllabus-only generation:

```bash
pnpm course:generate -- --code 9702 --gemini
```

## Content tiers

| Status | What students see |
|--------|-------------------|
| `outline` | Syllabus point, exam tips, links to mark + blog (auto from syllabus) |
| `published` | Full lesson JSON: intro, formulas, worked examples, practice CTA |

## Adding a full lesson

1. Pick syllabus code + topic, e.g. `9709` + `1.7`.  
2. Run `node scripts/generate-course-lesson.mjs --code 9709 --topic 1.7` (with `GEMINI_API_KEY`).  
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
| Revision flashcards | Flip-card deck in visual tab |
| Course schema | `CourseLessonJsonLd` |
| Zen theme | Course studio adapts to light “Zen” theme |

## Batch generate (Gemini)

```bash
pnpm course:generate -- --code 9702
pnpm course:generate -- --code 9702 --topic 9.1
pnpm course:generate -- --code 9702 --limit 10 --force
```

Requires `GEMINI_API_KEY` in `.env.local` (content generation: `gemini-2.5-pro`).

## Roadmap

- [ ] Finish premium lessons for all 9702 / 9700 / 9701 topics  
- [ ] Supabase `course_progress` for signed-in users  
- [ ] “Continue course” on dashboard  
- [ ] Gemini diagrams per topic → `public/courses/diagrams/`
