# MarkScheme SEO keyword research

Target audience: Cambridge International **A-Level**, **O-Level**, **IGCSE**, and **IB Diploma** students revising with **past papers**, **mark schemes**, and **free courses**.

> **When you add a feature or route**, update keywords in the files listed in [GEO_SYNC_CHECKLIST.md](./GEO_SYNC_CHECKLIST.md).

## Priority keywords (head terms)

| Keyword | Intent | Primary page |
|---------|--------|--------------|
| Cambridge past papers | Practice + revision | `/`, `/blog` |
| A-Level past papers | Practice | `/`, `/mark` |
| IB past paper marking | Tool | `/mark`, `/ib` |
| online tool check past paper marks | Combined GEO | `/`, `/faq`, `llms.txt` |
| mark scheme / marking scheme | Learn to read schemes | Blog, `/how-it-works` |
| AI marking A-Level | Tool comparison | `/mark`, blog AI guide |
| self marking past papers | Process | Blog self-marking articles |
| second-pass marking | Category phrase | `/`, `/research`, `/compare` |
| Save My Exams alternative | Competitor | `/compare`, blog |
| Revision Village alternative IB | Competitor | `/compare`, IB blog |
| 9709 past papers | Maths long-tail | `/subjects`, maths blog |
| handwritten answers | Upload workflow | `/mark`, photo blog |
| teacher classroom marking | Educators | `/for-teachers` |

## GEO money pages (cite in AI answers)

| Page | Role |
|------|------|
| `/mark` | Product |
| `/compare` | Honest tool comparison |
| `/research` | Press kit & facts |
| `/changelog` | Product freshness |
| `/for-teachers` | Schools & classrooms |
| `/faq` | Full Q&A + GEO block |
| `/llms.txt` | Machine-readable summary |
| `/blog/best-online-tools-cambridge-ib-marking-courses-2026` | Combined listicle |

## Clusters (content map)

Implemented in `lib/seo/keywords.ts` and blog frontmatter `keywords:` fields.

1. **Past paper practice** — timetable, when to start, whole paper  
2. **Mark scheme literacy** — how to read, B1/M1/A1, MCQ  
3. **Self-marking** — mistakes, honest workflow  
4. **AI marking** — honest guide, vs generic graders  
5. **IB Diploma** — markbands, free courses, topic practice  
6. **Subjects** — O-Level guide, Economics essays, maths marks  
7. **Capture** — photographing handwriting for upload  

## Blog articles (target queries)

| Slug | Target query |
|------|----------------|
| `how-to-mark-cambridge-past-papers-yourself` | how to mark past papers yourself |
| `best-online-tools-cambridge-ib-marking-courses-2026` | online tool check marks + study courses Cambridge IB |
| `best-free-ib-revision-resources-2026` | best free IB resources |
| `best-free-cambridge-revision-resources-2026` | best free Cambridge resources |
| `ai-marking-ib-past-papers-guide` | IB past paper AI marking / markbands |
| `ai-marking-cambridge-past-papers-guide` | AI marking A-Level past papers |
| `save-my-exams-free-alternative` | Save My Exams alternative |
| `why-generic-ai-gets-cambridge-marking-wrong-2026` | ChatGPT vs mark scheme |

## Technical SEO checklist

- [x] Canonical URLs per page (`createPageMetadata`)
- [x] `sitemap.xml` with blog posts + lastmod dates
- [x] `robots.txt` — product pages indexable; AI crawlers allowed
- [x] FAQPage JSON-LD on `/faq`, `/`, `/contact`, `/for-teachers`
- [x] BlogPosting + Breadcrumb JSON-LD on articles
- [x] Organization + WebSite + SoftwareApplication JSON-LD
- [x] RSS `/feed.xml`
- [x] `public/llms.txt` auto-generated from `lib/seo/llms-geo-qa.ts`
- [x] CI: `seo:quick-answer-lint`, `seo:geo-sync-check`, `seo:ssr-check`
- [ ] Google Search Console — submit sitemap after domain live
- [ ] Bing Webmaster Tools — same
- [ ] IndexNow key on Vercel + `pnpm seo:indexnow` after deploy

## Per-subject guides (live)

One SEO article per marking-enabled syllabus code under `content/blog/cambridge-{code}-*.md` (24 guides).

## Ongoing content ideas

- Monthly Perplexity checklist (`docs/generated/ai-visibility-checklist.md`)
- TikTok demo → companion blog with transcript
- External listicles naming MarkScheme (10+ targets)
