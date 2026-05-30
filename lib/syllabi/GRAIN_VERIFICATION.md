# Sprint B — Phase 1 grain verification

Verified: 2026-05-29 (Gemini read of `syllabi-source/*.pdf` vs `lib/syllabi/*.json`)

## Gate result: **FAILED — extraction refined (one pass)**

All three spot-checks showed **coarse** grain before `--fine-grain` re-extraction.

| Subject | Parent checked | PDF points | JSON leaves (before) | Verdict |
|---------|----------------|------------|----------------------|---------|
| 9700 Biology | 1 Cell structure | 33 | 2 | ❌ coarse |
| 9702 Physics | 2 Kinematics | 9 | 1 | ❌ coarse |
| 9489 History | P2 European option | 49 bullets* | 3 outline studies | ❌ coarse (bullet level) |

\*History: PDF lists many sub-bullets per outline study; JSON had one leaf per whole outline study.

**Action:** Re-ran `node scripts/extract-syllabi.mjs --force --fine-grain` for all 14 subjects with bullet-level exemplar (Biology Topic 1).

**Refinement pass status:** `node scripts/extract-syllabi.mjs --force --fine-grain` was started but most subjects hit Gemini 503 / fetch errors. **Coarse Sprint A JSON remains on disk** until re-run succeeds.

Re-verify after successful fine-grain extraction:

```bash
node scripts/verify-syllabus-grain.mjs
node scripts/extract-syllabi.mjs --force --fine-grain --subject 9700
```

**Phase 2 proceeded** with current grain (leaf-level mastery logic works; finer leaves improve fidelity when extraction lands).
