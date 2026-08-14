# Where the IB guides come from

Every guide this catalogue needs is published by the IB itself, free and without
a login, under one path:

```
https://ibo.org/globalassets/new-structure/university-admission/pdfs/subject-guides/
```

Verified 2026-08-15 by fetching each one: all returned `200 application/pdf` at
3–5.7 MB, which is a full guide rather than the two-page `subject-brief-*.pdf`
documents that live elsewhere on the site and contain no assessment criteria.

**Use these. Do not use dl.ibdocs.re, archive.org, Studocu, Scribd or similar.**
They mirror the same documents, and sourcing licensed assessment content from
them would make the open copyright finding materially harder to defend for no
benefit — the official copy is free, identical, and one click away.

## Needed now

| File (append `.pdf`) | Bytes | Why |
|---|---|---|
| `language-a-language-literature-guide` | 3,362,102 | **Highest priority.** Our stored Paper 2 is A10 B10 C5 D5 = 30; the live guide is A5 B10(B1+B2) C5 D5 = 25. Wrong denominator on every Language A Paper 2. Check the cover — this filename may still serve the 2021 edition, in which case the 2026 one is elsewhere. |
| `philosophy-guide` | 4,287,537 | Titled *First assessment 2025*. Ours is the 2016 guide, withdrawn after Nov 2024. |
| `psychology-first-assessment-2027-guide-sbs` | 3,319,207 | Final session was May 2026. |
| `computer-science-first-assessment-2027-guide-sbs` | 3,052,165 | Final session was May 2026. |
| `design-technology-first-assessment-2027-guide-sbs` | 3,289,996 | Final session was May 2026. |
| `visual-arts-first-assessment-2027-guide-sbs` | 5,671,223 | Final session was May 2026. Structural rewrite — comparative study replaced by a Connections Study, SL/HL now diverge. |
| `extended-essay-first-assessment-2027-guide-sbs` | 4,789,255 | Final session was May 2026. Total drops 34 → 30; presentation criterion removed. |

Also present, not currently needed: `language-b-guide` (2,984,451 — current to
May 2028) and `language-a-literature-guide` (3,356,718 — that course is not in
our catalogue).

## Getting them onto disk

`curl` cannot: ibo.org answers 403 to non-browser clients on TLS fingerprint, so
a browser user-agent does not help. They download normally in a real browser.

Once a PDF is anywhere on disk:

```
node scripts/extract-ib-criteria.mjs <guide.pdf> <subject-code> <out.json>   # writes JSON for review
node scripts/apply-ib-criteria.mjs  <out.json>                              # separate, deliberate step
```

The two steps are separate on purpose. Criteria are verbatim licensed content and
a bad extraction puts a wrong rubric in front of students, which is worse than an
old one.
