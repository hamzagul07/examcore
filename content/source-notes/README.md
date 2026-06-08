# Your subject notes (private upload folder)

Put **your own** revision notes here. They are **not** shown on the website directly.
Gemini reads them as reference and writes **original** lessons with flashcards, visuals, and diagrams.

## Folder layout

```
content/source-notes/
  9702/                          ← subject code
    12.2.md                      ← one file per topic (preferred)
    12-2-centripetal.md          ← or slug-style name
    _full-physics.md               ← optional: whole-subject file (split by topic headings)
  9700/
    14.1.md
  9709/
    1.7.md
```

## File naming (pick one style)

| Style | Example | Matches topic |
|-------|---------|---------------|
| Syllabus code | `12.2.md` | Topic 12.2 |
| Code with dashes | `12-2.md` | Topic 12.2 |
| Slug | `12-2-centripetal-acceleration.md` | Same as lesson slug |

Supported formats: `.md`, `.txt`, `.pdf` (PDF needs Gemini OCR pass — use `.md` when possible).

## Whole-subject files

Name: `_full.md`, `9702-full.md`, or `notes.md` inside the subject folder.

Use headings that include the topic code:

```markdown
## 12.2 Centripetal acceleration
Your notes here...

## 12.3 Centripetal force
More notes...
```

## Generate lessons from your notes

```bash
# One topic
pnpm course:from-notes -- --code 9702 --topic 12.2

# Whole subject (only topics with matching note files)
pnpm course:from-notes -- --code 9702

# Regenerate + diagrams
pnpm course:from-notes -- --code 9702 --topic 12.2 --diagrams

# Dry run (shows which notes were found)
pnpm course:from-notes -- --code 9702 --dry-run
```

Requires `GEMINI_API_KEY` in `.env.local`. Model: `gemini-2.5-flash`.

Output: `content/courses/{code}/{slug}.json` (premium lesson, original wording).

Diagrams: `public/courses/diagrams/{code}/{slug}.png` when `--diagrams` is set.

## School PMT ingest (licensed use only)

If your school has permission to use [Physics & Maths Tutor](https://www.physicsandmathstutor.com/) materials internally, you can pull **PDFs into this private folder** and let Gemini write **original** lessons — nothing is pasted verbatim onto the site.

```bash
# One parent topic (e.g. Topic 12) — downloads PDFs, writes leaf outlines
pnpm course:from-pmt -- --code 9702 --parent 12

# One leaf + generate lesson + flashcards (+ optional diagrams)
pnpm course:from-pmt -- --code 9702 --topic 12.2 --generate --diagrams

# Preview without API calls
pnpm course:from-pmt -- --code 9702 --parent 12 --dry-run
```

Private files created:

```
content/source-notes/9702/
  _pmt-import/12/*.pdf          ← downloaded PMT PDFs (never committed)
  _pmt-import/12-outline.md     ← Gemini factual outline from PDFs
  12.2.md                       ← per-topic outline for lesson generation
```

Then (if you did not pass `--generate`):

```bash
pnpm course:from-notes -- --code 9702 --topic 12.2 --diagrams
```

For **public links only** (no download): `pnpm course:pmt-links -- --code 9702 --apply`

## Copyright

- Only upload notes **you own** or have **school permission** to use.
- PMT PDFs stay in `_pmt-import/` (gitignored). Published lessons are **Gemini-authored**, not copied PMT text.
- Do **not** commit third-party PDFs or paste copyrighted wording into `content/courses/`.

This folder is gitignored by default so your files stay on your machine.
