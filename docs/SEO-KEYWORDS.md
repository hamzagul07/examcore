# MarkScheme SEO keyword research

Target audience: Cambridge International **A-Level** and **O-Level** students (and parents) revising with **past papers** and **mark schemes**.

## Priority keywords (head terms)

| Keyword | Intent | Primary page |
|---------|--------|--------------|
| Cambridge past papers | Practice + revision | `/`, `/blog` |
| A-Level past papers | Practice | `/`, `/mark` |
| O-Level past papers | Practice | `/subjects`, blog O-Level guide |
| mark scheme / marking scheme | Learn to read schemes | Blog, `/how-it-works` |
| AI marking A-Level | Tool comparison | `/mark`, blog AI guide |
| self marking past papers | Process | Blog self-marking articles |
| 9709 past papers | Maths long-tail | `/subjects`, maths blog |
| 9708 past papers | Economics essays | Blog economics article |
| handwritten answers | Upload workflow | `/mark`, photo blog |
| mark whole past paper | Full paper workflow | Blog whole-paper article |

## Clusters (content map)

Implemented in `lib/seo/keywords.ts` and blog frontmatter `keywords:` fields.

1. **Past paper practice** — timetable, when to start, whole paper  
2. **Mark scheme literacy** — how to read, B1/M1/A1, MCQ  
3. **Self-marking** — mistakes, honest workflow  
4. **AI marking** — honest guide, vs generic graders  
5. **Subjects** — O-Level guide, Economics essays, maths marks  
6. **Capture** — photographing handwriting for upload  

## Blog articles (target queries)

| Slug | Target query |
|------|----------------|
| `how-to-mark-cambridge-past-papers-yourself` | how to mark past papers yourself |
| `cambridge-a-level-maths-mark-scheme-b1-m1-a1` | B1 M1 A1 marks 9709 |
| `cambridge-o-level-past-papers-guide` | O-Level past papers revision |
| `how-to-read-a-cambridge-mark-scheme` | how to read a mark scheme |
| `marking-a-level-economics-essays-at-home` | economics essay marking A-Level |
| `cambridge-past-paper-revision-schedule` | past paper revision timetable |
| `photograph-handwritten-past-paper-answers` | photograph handwritten answers exam |
| `ai-marking-cambridge-past-papers-guide` | AI marking A-Level past papers |
| `mark-whole-cambridge-past-paper` | mark whole past paper |
| `cambridge-mcq-past-papers-how-to-mark` | MCQ past papers Cambridge |
| `common-mistakes-self-marking-past-papers` | self marking mistakes |
| `when-to-start-past-papers-cambridge-a-level` | when to start past papers A-Level |
| `why-i-built-markscheme` | brand / founder story |

## Technical SEO checklist

- [x] Canonical URLs per page (`createPageMetadata`)
- [x] `sitemap.xml` with blog posts + lastmod dates
- [x] `robots.txt` — product pages indexable; app routes noindex
- [x] FAQPage JSON-LD on `/faq`
- [x] BlogPosting + Breadcrumb JSON-LD on articles
- [x] Organization + WebSite JSON-LD sitewide
- [x] RSS `/feed.xml`
- [x] `public/llms.txt` for AI crawlers
- [ ] Google Search Console — submit sitemap after domain live
- [ ] Bing Webmaster Tools — same
- [ ] Core Web Vitals — monitor after launch

## Ongoing content ideas

- Per-subject posts (9702 Physics, 5090 Biology)  
- “May/June vs October/November” session tips  
- Examiner report summaries by year  
- Comparison: MarkScheme vs marking your own (no competitor bashing)
