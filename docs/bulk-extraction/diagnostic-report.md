# Bulk extraction diagnostic — overnight run (2026-06-07)

## Process status

| Check | Result |
|-------|--------|
| PID in `tmp/bulk-extraction.pid` | **3092** |
| `Get-Process -Id 3092` | **Still running** (Node, started 2026-06-07 03:29) |
| PowerShell wrapper PID 30432 | Also alive |

**Verdict: hanging, not dead.** Progress log frozen at `SESSION m24 start` for ~6+ hours while Node remains alive.

## Stdout tail (last meaningful events)

No explicit fatal stack trace. Pattern before silence:

1. Heavy **Gemini 503** retry storms on Flash (tagging/LaTeX side work during QP parse)
2. Several QP Pro extractions started in parallel (`Single-shot Pro extract`)
3. Mark scheme linking began; multiple MS PDFs hit **`This operation was aborted`**
4. **`UND_ERR_HEADERS_TIMEOUT`** on `gemini-2.5-pro` (600s HTTP timeout exceeded)
5. MS jobs fell back to chunked extraction; then log ends on more 503 retries

**Root cause (likely):** concurrency=4 saturated Gemini + long-running Pro calls. One or more MS extractions aborted/timed out; the pool blocked without per-PDF timeout or heartbeat, so the runner appeared stalled while still retrying inside Node.

## `extraction_jobs` table

| Status | Count |
|--------|-------|
| completed | 10 |

- **No rows stuck in `running`** in DB (jobs either completed or never marked running before hang)
- 10 completed ≈ m24 partial (5 QP + 5 MS plausible) while session never advanced in progress log

## Data layer snapshot

- **350** `extracted_questions` (m24 + s24)
- Progress log never logged `SESSION m24 done`

## Actions before restart (Hassan)

1. **Kill the hung process:**
   ```powershell
   Stop-Process -Id 3092 -Force
   ```
2. **Disable sleep** (Windows):
   ```powershell
   powercfg /change standby-timeout-ac 0
   powercfg /change monitor-timeout-ac 0
   ```
3. **Restart** (after pulling hardened runner — see below):
   ```powershell
   cd c:\Users\Mg\Documents\projects\examcore
   npx tsx scripts/bulk-extract-sessions.mjs `
     --sessions=m24,w24,m23,s23,w23,m22,s22,w22 `
     --subject=9702 `
     --concurrency=2 `
     --global-cost-cap=150 `
     --per-session-cost-cap=15 `
     --per-pdf-cost-cap=1.50 `
     --per-pdf-timeout=600 `
     --progress-log=tmp/bulk-extraction-progress.log `
     --pid-file=tmp/bulk-extraction.pid `
     *> tmp/bulk-extraction-stdout.log
   ```
   Run in a **fresh terminal** (or `Start-Process` with `-WindowStyle Hidden`) so it owns its shell.

## Hardening added (this commit)

| Safeguard | Detail |
|-----------|--------|
| `--per-pdf-timeout=600` | 10 min max per PDF; marks job failed and continues |
| Heartbeat | Progress log entry every 60s while runner alive |
| Memory log | RSS heap logged every 10 PDFs processed |
| Stale job reset | `running` jobs older than 1h reset to `pending` on startup |
| Default concurrency | CLI default lowered to **2** |
