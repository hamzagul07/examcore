# Tier 2 syllabus audit

**Generated:** 2026-06-07T13:53:35.249Z

## 9709

- **Status:** BLOCKED — `syllabi-source/9709.pdf` missing
- Note: coarse topic map exists in `lib/syllabus.ts` (38 topics) but fine-grain objectives for tagging require the Cambridge PDF.

## 9618

- **Status:** PDF present, extraction not run yet
- DB rows: 0

## 9706

- **Status:** PDF present, extraction not run yet
- DB rows: 0

## 9708

- **Status:** PDF present, extraction not run yet
- DB rows: 0

## Extraction attempt log

| Subject | Attempted | Result |
|---------|-----------|--------|
| 9618 | 2026-06-07 | Failed — Vertex 429 while 9702 bulk (PID 34736) still running |
| 9706 | — | Deferred (rate limit) |
| 9708 | — | Deferred (rate limit) |
| 9709 | — | Blocked (no PDF) |

## Next steps

1. **Hassan:** download `9709.pdf` → `syllabi-source/9709.pdf` from Cambridge International.
2. **Wait** for Tier 1 bulk to finish (or pause it) before re-running syllabus extraction.
3. **Phase 1 commands** (after unblock):

```powershell
pnpm extract:syllabus 9618 --persist
pnpm extract:syllabus 9706 --persist
pnpm extract:syllabus 9708 --persist
pnpm extract:syllabus 9709 --persist
node scripts/tier2-syllabus-audit.mjs
```

4. Hassan reviews `tier2-syllabus-audit.md` before s24 pilots.
5. Pilots: `pnpm bulk:extract --subjects=<code> --sessions=s24 --concurrency=4` per subject.