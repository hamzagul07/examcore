# MarkScheme — Wikidata entity (LIVE)

**Item:** [Q140455387](https://www.wikidata.org/wiki/Q140455387)  
**Wired in code:** `lib/seo/entity.ts` → `Organization.sameAs` + `identifier` (default; override with `NEXT_PUBLIC_WIKIDATA_ENTITY_URL`).

---

# MarkScheme — Wikidata entity draft & creation playbook

Goal: a Wikidata item for **MarkScheme** so Google's Knowledge Graph and AI answer
engines (AI Overviews, ChatGPT, Perplexity, Gemini) recognise the brand as a
distinct entity. Once it exists, set `NEXT_PUBLIC_WIKIDATA_ENTITY_URL` and it flows
into the `Organization.sameAs` JSON-LD automatically (see `lib/seo/entity.ts`).

---

## ⚠️ Read first — notability (this is the real risk)

Wikidata is more permissive than Wikipedia, but items are **patrolled and deleted**
if they look promotional or non-notable. A small product with zero outside
references is at real risk of deletion — and a deleted item is worse than none.

Wikidata notability needs **one** of:
1. a serious, publicly available reference describing the entity, **or**
2. it's a clearly identifiable entity that *can* be described with serious sources, **or**
3. it fills a structural need (e.g. it's the value of a statement on another notable item).

**Recommendation: create 1–2 citable references FIRST, then create the item citing them.**
Easiest, in order:
- **Crunchbase** organisation profile (free) → gives external ID **P2088**
- **LinkedIn** company page → external ID **P4264**
- A **Product Hunt** / app-store / press listing, or a review on a known ed-tech blog
- GitHub organisation (if public)

These double as `sameAs` targets even if you never make the Wikidata item — so they're
worth doing regardless. **Don't rely on Wikidata alone**; the env vars below accept
LinkedIn/Crunchbase/etc. directly.

> Verify every `Q…`/`P…` id in Wikidata's search before saving — pick the item the
> autocomplete suggests rather than trusting an id from this doc.

---

## The draft item

**Label (English):** `MarkScheme`

**Description (English, neutral, ~lowercase, no marketing):**
`web application for marking Cambridge International exam past papers`

**Also known as (aliases):** `MarkScheme.app`; `markscheme.app`

### Statements

| Property | Value | Notes |
|---|---|---|
| **P31** instance of | `web application` (or `application software`) | pick the closest item via search |
| **P31** instance of | `online service` | optional second value |
| **P856** official website | `https://markscheme.app` | add reference: P854 = same URL |
| **P452** industry | `educational technology` | |
| **P366** has use | `exam preparation` / `assessment` | optional |
| **P407** language of work or name | `English` (Q1860) | |
| **P571** inception | the year you launched | only if you can source it |
| **P968** email address | `hello@markscheme.app` | optional |
| **P127** owned by / **P112** founded by | *(skip unless the founder/company is itself notable)* | |

### External identifiers (the high-value part for `sameAs`)

Add whichever you actually create — these are what AI engines cross-reference:

| Property | Value |
|---|---|
| **P2088** Crunchbase organisation ID | `<crunchbase-slug>` |
| **P4264** LinkedIn company ID | `<linkedin-company-id>` |
| **P2397** YouTube channel ID | `<channel-id>` (if you have one) |
| **P2002** X/Twitter username | `<handle>` (if you have one) |
| **P2003** Instagram username | `<handle>` (if you have one) |

### References (attach to the key statements)

For P31 and P856, add a reference:
- **P854** reference URL → `https://markscheme.app`
- **P813** retrieved → today's date

If you get a press mention/review, cite it on P31 with **P248** (stated in) — that's
the strongest anti-deletion signal.

---

## Step-by-step creation

1. **Create an account** at https://www.wikidata.org (use a real email; do a few
   unrelated good edits first so the account isn't brand-new when you create a
   self-item — reduces deletion suspicion).
2. **Search first** for "MarkScheme" to confirm no item exists.
3. **Special:NewItem** → set the English **label** and **description** above. Add aliases.
4. **Add statements** one by one (the table above). Start with **P31** and **P856** —
   those two establish "what it is" and "where it lives".
5. **Add a reference** to P856 and P31 (P854 = markscheme.app, P813 = today).
6. **Add external identifiers** (P2088, P4264, …) for every profile you created in the
   notability step. These are the strongest entity signals.
7. **Save.** Copy the item URL — it looks like `https://www.wikidata.org/wiki/Q1234567`.
8. **Wire it back into the site:** set the deploy env var
   ```
   NEXT_PUBLIC_WIKIDATA_ENTITY_URL=https://www.wikidata.org/wiki/Q1234567
   ```
   `getBrandSameAs()` in `lib/seo/entity.ts` already injects it into the Organization
   `sameAs` array on every page — no code change needed.
9. **(Optional, advanced)** Add a statement on a *related* item that uses MarkScheme as
   a value, to satisfy notability criterion 3 (structural need).

---

## After it's live

- **Google Search Console → URL Inspection** on your homepage; request indexing so the
  new `sameAs` is recrawled.
- **Validator:** run the homepage through Google's Rich Results Test and schema.org
  validator — confirm `Organization.sameAs` contains the Wikidata URL.
- Keep the other `sameAs` env vars filled (`NEXT_PUBLIC_LINKEDIN_URL`,
  `NEXT_PUBLIC_TWITTER_URL`, `NEXT_PUBLIC_YOUTUBE_URL`,
  `NEXT_PUBLIC_FOUNDER_LINKEDIN_URL`) — entity confidence comes from *consistent,
  cross-linked* profiles, not Wikidata in isolation.

## Honest expectation

A Wikidata item helps entity recognition but is **not** a ranking switch. The compounding
wins are the consistent cross-linked profiles + real mentions over time. Treat Wikidata
as one node in that graph, created *after* you have a couple of references to anchor it.
