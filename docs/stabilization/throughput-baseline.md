# Vertex throughput baseline — Phase 3

**Status: BLOCKED — awaiting Hassan quota report**

## Stop gate

No extraction or baseline measurement runs until Hassan reports actual Vertex limits for **gemini-2.5-pro** in **us-central1**:

- TPM (tokens per minute)
- RPM (requests per minute)
- RPD (requests per day)

**Evidence for caution:** Diagram backfill on `qp_42` at concurrency=1 hit **429 RESOURCE_EXHAUSTED on every page**. Project capacity is likely below prior assumptions.

## When unblocked

1. Hassan copies `vertex-quotas.template.json` → `vertex-quotas.json` and fills `proTpm` / `proRpm` / `proRpd`
2. Run:

```powershell
npx tsx scripts/run-throughput-baseline.mjs
```

3. Review generated metrics in this file (overwritten on success) and `throughput-baseline-raw.json`

## Three PDF archetypes (sequential, concurrency=1)

| Type | PDF | Purpose |
|------|-----|---------|
| MCQ | `cambridge/9702/s24/qp_12.pdf` | Lower-bound tokens |
| Structured | `cambridge/9702/s24/qp_42.pdf` | Mid-range + diagram pass |
| Long context | `cambridge/9702/s24/qp_52.pdf` | Paper 5 upper bound |

Single-type run: `npx tsx scripts/run-throughput-baseline.mjs --pdf=structured`

## Metrics collected per API call

- Timestamp, model, phase (question-extraction / diagram-detection / latex-validation)
- Input tokens, output tokens, wall time, status, retry count

## Concurrency formula (applied after baseline)

```
theoretical_max = floor(vertex_TPM / peak_TPM_per_pdf)
recommended     = floor(theoretical_max × 0.65)   # burst + retry headroom
```

Use the **lowest** recommended value across PDF types for mixed bulk sessions.

---

*This file will be replaced with measurement results when Phase 3 completes.*
