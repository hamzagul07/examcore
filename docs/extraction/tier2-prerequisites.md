# Tier 2 prerequisites audit

**Generated:** 2026-06-07T13:51:36.319Z

## Syllabus PDFs

- **9709**: **MISSING** — download from Cambridge International
- **9618**: OK (729 KB)
- **9706**: OK (553 KB)
- **9708**: OK (599 KB)

## Past paper coverage

- **9709**: 246 QPs, 246 MSs, 17/17 sessions
- **9618**: 106 QPs, 106 MSs, 9/17 sessions
- **9706**: 136 QPs, 136 MSs, 17/17 sessions
- **9708**: 165 QPs, 165 MSs, 17/17 sessions

## Blockers

- Missing syllabi: 9709

## Connection pool

Verify manually in Supabase Dashboard → Database → Connection Pooling (target 40–60 for 16 concurrent extractions).

## Operational notes (2026-06-07)

- **9702 bulk still running** (PID 34736, session s22) — syllabus extraction hit Vertex `429 RESOURCE_EXHAUSTED`. Defer Tier 2 Phase 1 until bulk finishes or pause bulk before syllabus runs.
- **9618 paper gaps:** only 9/17 sessions in storage (missing m20–m22 era). Not a blocker for s24 pilot; full bulk will skip empty sessions.
- **9709 papers:** 246 QPs + 246 MSs across all sessions — ready once `9709.pdf` is added.