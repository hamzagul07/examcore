# markscheme.app — full code review (2026-09-25)

Scope: the whole repo at commit `2f41359` (main). Marking backend read line by line by the lead reviewer; auth/RLS, billing, whole-paper pipeline, mark frontend and the secondary backends (Omni AI, courses, community, plan, teacher) reviewed by five parallel passes, with every High finding re-verified against the code by the lead reviewer. No files were modified. Local checks: `tsc --noEmit` clean, `eslint` 0 errors / 51 warnings, all 19 unit suites pass (the `content-source` suite only fails when pointed at a fake Supabase; CI on main is green, run #1036).

Severity key: **High** = exploitable, costs money, or breaks a paid promise today. **Medium** = real bug, bounded impact. **Low** = hardening / hygiene.

---

## 1. Fix first (High)

### 1.1 Open redirect through a backslash in `next` / `redirect`
- `lib/auth-redirect.ts:7-35` — `sanitizeNextPath` and `isSafeNextPath` only reject `//` and `://`. `/\evil.com` passes both.
- Verified: `new URL('/\\evil.com', 'https://markscheme.app/auth/signin').href === 'https://evil.com/'` (WHATWG treats `\` as `/` for http).
- Sinks: `proxy.ts:140-148` (signed-in user hitting `/auth/signin?next=/\evil.com` is redirected off-site with cookies applied), `app/onboarding/complete/route.ts:31-33,57,81` (reachable unauthenticated), and `app/auth/signin/page.tsx:143` via `/api/auth/check`'s `destination`.
- Fix: reject any `\` (and decoded `%5C`) in both helpers, and at every `new URL(dest, request.url)` sink assert `.origin` equals the site origin before redirecting. Add a backslash case to `lib/auth-redirect.test.ts`.

### 1.2 Onboarding "save token" is a 4-hour login credential carried in a GET URL
- `lib/onboarding/save-token.ts:21-31` — HMAC over `{userId, exp: +4h}`, signed with `ONBOARDING_SAVE_SECRET` or, by default, the **service-role key**.
- `components/onboarding/OnboardingWizard.tsx:347` puts it in the address bar: `/onboarding/complete?next=…&token=…`.
- `app/onboarding/complete/route.ts:60-85` (auth-exempt in `proxy.ts:158`) accepts it with no session and calls `restoreSessionForUserId` (`lib/onboarding/restore-session.ts:47-68`), which uses `auth.admin.generateLink({type:'magiclink'})` + `verifyOtp` to **log the browser in as that user**. `app/api/onboarding/route.ts:26-35` also accepts it to write the profile through the service client, including `role: 'teacher'`.
- Anyone who sees the URL (shared school machine history, proxy/CDN logs, Sentry breadcrumbs, screenshot) gets a working login for 4h that survives sign-out and password change.
- Fix: remove the session-restore path and fix the cookie loss that motivated it; if a token must exist, make it single-use, ≤5 min, server-stored, bound to a browser cookie, consumed by POST. Set `ONBOARDING_SAVE_SECRET` explicitly (it is not in `.env.example`).

### 1.3 Yearly subscribers get the *monthly* cap once per year
- `lib/billing/caps.ts:122-133` — `currentPeriodWindow` returns Polar's `current_period_start/end` for any paid tier. For a yearly plan that is 12 months. `lib/billing/enforcement.ts:138` feeds it to every count and to `reserve_mark_usage`, against `TIER_MONTHLY_CAPS`.
- `billing_period` is written by the webhook (`polar-webhook/route.ts:245`) but never read anywhere in `lib/billing`. Yearly checkout is live (`checkout/route.ts:65`, `lib/polar/products.ts:31-35`).
- Result: Scholar yearly ($199) gets 120 marks and 150 chat messages **for the year**; monthly gets that every month.
- Fix: when `billing_period === 'yearly'`, derive a monthly sub-window anchored on `current_period_start` (advance by calendar months until now falls inside) and pass that to the RPC. Add a test.

### 1.4 Late `subscription.*` webhooks clobber the row → paying users stranded as "paid but inactive"
- `app/api/billing/polar-webhook/route.ts:239-254` — `syncSubscription` upserts on `user_id` with no guard on `polar_subscription_id` or event recency. `subscription.revoked` was scoped by subscription id (`:357-370`, comment admits ordering is not guaranteed) but the sync group was not.
- Scenario A: `subscription.updated` (status `canceled`, product still Scholar) lands after `revoked` (tier `free`) → row ends `tier=scholar, status=canceled` → `enforcement.ts:481-508` treats the user as `subscriptionInactive`: no free-tier marks, and a verified teacher is hard-blocked with `subscription_inactive`.
- Scenario B: cancel S1 → buy S2 (Max) → a late `updated` for S1 overwrites the row with S1's tier/status. Paying Max customer loses access until the next S2 event.
- Fix: in `syncSubscription`, read the existing row; skip when it holds a different, live `polar_subscription_id` (or compare Polar `modifiedAt`). Make `subscriptionInactive` defer to `ctx.access` so teachers/comps fall back to their seat.

### 1.5 Whole-paper "retry" can never work: a failed run wipes the job
- `app/api/mark/whole-paper/run/route.ts:362-374` — the catch **replaces** `attempts.ai_marking` with `{phase:'failed', …}`, dropping `paper_code`, `segmented_questions`, `pages_ocr`.
- The client then offers "retry to continue" (`components/whole-paper/WholePaperFlow.tsx:220-249`), which POSTs `run` again → `run/route.ts:150-151` returns 400 "Job missing paper context". A guest has already spent the day's slot at init.
- Fix: merge, don't replace: `{...job, phase:'failed', error}`.

### 1.6 Whole-paper PDFs still use the whole-document OCR that #119 replaced
- `app/api/mark/whole-paper/init/route.ts:166` calls `ocrPdfToPages(pdfBytes)` with no `ocrPage`, so `lib/marking/pdf-pages.ts:187` falls back to `ocrPdfWhole`: one giant call, no `MAX_PDF_PAGES` cap (the cap lives only in the split path), no Flash→Pro escalation. The 16-of-28 PDF failure mode is fixed only in `single-question-pipeline.ts:841`. PDF pages also get `photo_url: ''` so no ink overlay.
- Fix: pass `{ ocrPage: (bytes) => ocrAnswerBufferWithBoxes(Buffer.from(bytes), 'application/pdf', subjectCode) }` exactly as the single-question path does.

### 1.7 Unauthenticated Gemini spend is not actually bounded
- **Guest mark limit is check-then-increment and only increments after success.** `lib/rate-limit.ts:66-119` reads `mark_count`, and `app/api/mark/process/route.ts` increments only after the whole pipeline finishes (minutes later). N parallel guest requests from one IP all pass `count >= 1`; each is derive + mark + verify (+ tiebreak) on Gemini Pro. `whole-paper/init` charges at the start (good) but with the same non-atomic read→upsert.
- **`/api/courses/teach-back` and `/api/courses/explain`** (`teach-back/route.ts:23-37`, `explain/route.ts:39-50`) are unauthenticated and guarded only by an in-process `Map` bucket, which on Vercel is per-lambda and empty on every cold start. Teach-back is up to 2 Pro-class calls per hit with no cache.
- **Legacy whole-paper branch in `/api/mark/process`** (`route.ts:~780-960`) is unreachable from the UI (`app/mark/page.tsx:1736` blocks it) but live for direct callers: slices to 15 questions regardless of tier (`wholePaperQuestionLimit` is only applied in `whole-paper/init`), marks them sequentially **with verify**, for one reservation. Guests included.
- Fix: one atomic RPC (`insert … on conflict do update set mark_count = mark_count + 1 returning mark_count`) consumed at request start, refunded on failure; require auth or use the persisted `rate_limits` table for teach-back; delete the legacy branch.

### 1.8 The client never sends `client_request_id`, so a dropped connection invites a second charged run
- `app/mark/page.tsx:1819-1911` appends every documented field except `client_request_id`; the server dedupe (`process/route.ts:326-329, 398-411`) is dead from this page.
- On `reader.read()` throwing before `result` (`page.tsx:2041-2066`) the UI shows "tap Mark again" while the server keeps running (`route.ts:551-565`), charges (`:596`) and emails. Tapping Mark again starts and charges a second run.
- A 200 JSON `{duplicate:true}` reply is also unhandled (`page.tsx:1916` only branches on `!res.ok`).
- Fix: `crypto.randomUUID()` per submit, reused on retry; on drop-before-result with a pending record, show "still running" and poll `run-status` instead of offering a re-mark; check `content-type` before entering the SSE reader.
- Related server bug: the unique index `uq_mark_runs_client_request_id` (`20260906_mobile_mark_run_idempotency.sql`) is **global**, and the lookup in `process/route.ts:~395` is not scoped by user. Any caller can collide with another user's key (denial + `mark_run_id` disclosure), and a retry after `error/abandoned` hits 23505 in `openMarkRun` and silently loses telemetry. Scope index and lookup by `(user_id, client_request_id)`; reuse the row on retry.

---

## 2. Medium

### Marking core
- **Charge bookkeeping can turn a finished mark into an error.** `process/route.ts` streaming branch: `finalizeReservation → settleRunSuccess → chargeMultiQuestion → send(result)`. If `recordExtraMarkUsages` throws, the catch cannot release (already settled) and emits `error`; the student sees a failure for a completed, charged, saved mark. Send the result first; do extra-usage rows in `after()`.
- **Extra-question charges bypass the cap.** `enforcement.ts:638-668` inserts usage rows with no cap check. Free user with 1 mark left uploads a 3-question script → 3 marks used. Reserve `questionCount` at the gate or refuse extras beyond cap.
- **Credits are not reserved under the lock.** `enforcement.ts:540-544` sets `via_credit` from a balance read outside `pg_advisory_xact_lock`; `consume_credit` runs only in finalize after the AI work and falls through to a plain usage row when it fails. 20 parallel marks at cap with 1 credit → 20 marks for 1 credit. Consume/hold the credit inside `reserve_mark_usage`, refund on release.
- **Leaked reservations are never reclaimed.** A killed function leaves the reservation row (`attempt_id NULL`); `cron/mark-run-sweep` only flips `mark_runs.status`, and `mark_runs` never stores the reservation `event_id`. The student permanently loses one mark this period. Store `event_id` on `mark_runs`; sweep deletes reserved rows for abandoned runs.
- **Teacher seats and comps are ignored by every feature gate in the mark path.** Only `enforcement.ts:115-120` passes `teacherVerified`/`accessOverride` to `effectiveAccess`; `process/route.ts:429-433`, `whole-paper/init:105-116`, `whole-paper/run:212-215`, `omni-ai/route.ts:211-214`, `dashboard/page.tsx:238` recompute from `{tier,status}` only. A verified teacher gets a Scholar allowance but is capped at 3 whole-paper questions in preview mode and skips verify/rewrite. Put `access` on `MarkAllowance` and use it everywhere.
- **Partial refunds only reverse credits once.** `20260724_credit_topup_refund_idempotent.sql:167-175` keys the ledger on `polar_order_id`; Polar sends cumulative `refunded_amount` per refund. 10% goodwill then full refund → customer keeps 90% of credits. Key on cumulative amount or store reversed-so-far and deduct the delta.
- **Whole-paper: charged even when every question fails; deadline swallowed.** `run/route.ts:333-337` finalizes unconditionally; `markWholePaperQuestionSafe` (`mark-runner.ts:~1231`) catches `RequestDeadlineExceededError` (the rethrows at 872/890/957 are inside `markSingleQuestion`), so after the 780s budget every remaining question "fails fast" and the paper is finalized and charged. Release when all `marking_failed` or a deadline error was seen; rethrow deadline errors from the Safe wrapper.
- **Whole-paper: a killed run is stuck in `'marking'` forever.** The claim (`run:169-177`) is atomic but has no expiry; whole-paper never opens a `mark_runs` row, so it is invisible to the sweep, `run-status` and `PendingMarkWatcher`; the client polls until 12 consecutive HTTP failures. Store `claimed_at` and let the claim match stale rows; open a `mark_runs` row.
- **Whole-paper: free-tier truncation shown as "Not attempted".** `init:237-242` slices to 3; `buildFullQuestionList` fills the rest as `unattempted`, so `full_paper_score`/grade treat cut questions as zero. `questions_in_paper`/`question_limit` from init are never used by the client. Add a distinct status and suppress the full-paper grade when truncated.
- **Whole-paper init hygiene.** OCR is sequential with no per-page tolerance (`init:178-201`; single-question runs 4 in flight); guest slot consumed before any validation (`init:88`); dedupe and page-order checks (`single-question-pipeline.ts:873,894`) are not applied; segmentation `maxOutputTokens: 4000` must echo every answer's text for up to 15 questions; status polling re-signs every photo every 2 s (`status:68-86`); concurrent per-question retries last-write-wins on the whole JSONB (`retry:53-57,167-204`); guests can never use per-question retry (init already consumed the 1/day slot).

### Frontend (mark flow)
- **Finished-mark banner leaks across users on a shared machine.** `lib/marking/pending-mark.ts:128-140` stores `{attemptId, marksEarned, totalMarks}` in localStorage (60 min); `PendingMarkWatcher.tsx:61-77` renders "Your mark is ready 7/10" + attempt link with no ownership check; nothing clears it on sign-out. Store owner id and compare, or clear on sign-out.
- **Focus trap re-runs on every render and steals focus.** `MarkingWaitOverlay.tsx:53-59` passes a fresh `[]` as `extraRoots`; `useFocusTrap.ts:104` has it in deps and refocuses `items[0]` on every SSE event when `(pointer: fine)` and ≤1023px. Once the provisional card renders, the first focusable is "Go and do something else", so a stray Enter navigates away mid-mark. Hoist a module-level constant.
- **Result-only heavy modules load eagerly.** `page.tsx` is one 172 KB client module; `MarkingResultView` (react-markdown, rehype-katex, katex) and `WholePaperFlow` are static imports. `next/dynamic` both. (three/gsap/mermaid/vega are *not* on the mark path.)
- **Dead hard-error path.** The page always passes `onSoftMarkFailure`, so `setMarkStreamError(msg)`, `MarkingStoppedCard`, `errorRetryable`, `onRetry`/`onBackToUpload` are unreachable; `onBackToUpload` would also leave the Mark button dead (no abort, no `submittingRef` release). Delete or route through `showMarkFailure`.

### Community / Omni / Teacher
- **Community attachment paths are client-supplied and never bound to the uploader.** `api/community/posts/route.ts:96-100` accepts any `path` string; `lib/community/posts.ts:296-316` and `notes.ts:152` store it; the page signs it with the service role for every visitor. `20260906_mobile_community_uploads_read.sql` grants `authenticated` SELECT on the **whole** `community-uploads` bucket, so any signed-in user can list every object and republish attachments of removed/moderated posts. Require `path.startsWith(\`${user.id}/\`)`, recompute `kind`/ext from mime, cap `name`; scope the storage policy to `(storage.foldername(name))[1] = auth.uid()::text`.
- **Teacher override has no bounds.** `api/teacher/attempt/[id]/override/route.ts:52-56` only checks `Array.isArray` + `typeof number`; negative or > total marks and an arbitrary `marks_awarded` array are written to `attempts` (`:78-86`), which feeds mastery, grade trajectory, weekly reports and the student's Omni system prompt (`lib/omni-ai/marking-context.ts:53-59`) — a teacher can inject instructions into a student's tutor context. `original_marks_awarded` after a second override is the previous override, not the AI result. Clamp `0 ≤ total ≤ attempt.total_marks`, validate entries, snapshot the AI original once.
- **Omni: no server-side prompt-size bound; tool loop can pull 100k+ tokens.** `api/omni-ai/route.ts:92-105` caps neither `query` nor per-message length (client trims to 200); `fetch_recent_attempts` returns up to 10 × ~16-20k chars across 3 rounds. Cap query ~2k and messages ~4k; return excerpts and let the model ask for one attempt by id.
- **Omni: model-controlled CTA `href` rendered as a link with no allowlist.** `lib/omni-ai/actions.ts:28-34` → `InlineCTA` `<Link href>`. Client-controlled `context.data` and the student's OCR text are interpolated unescaped into the system prompt (`system-prompts.ts:117-250`), so `[[ACTION:render_cta|text=Claim refund|href=https://evil]]` is straightforward; a teacher's prompt carries student-set names. Accept only same-origin paths.
- **Vote-reputation race.** `posts/[id]/vote/route.ts:24-46` reads `prevVote`, upserts, then `bump_subject_reputation` — three steps; two concurrent upvotes → +4 rep, toggle off → −2. Vote PKs are composite (double votes blocked); only the rep delta races. Do it in one RPC.
- **Mention spam.** Comments have no daily cap (posts 25, questions 20, notes 10, comments ∞); `notifyMentions` emails every mention and the cooldown is keyed on `href`, which for comments includes `#comment-<id>`, so it never fires. Loop "@victim" → unbounded emails.
- **Two reports auto-hide anything.** `api/community/report/route.ts` `FLAG_THRESHOLD = 2`, no reporter-quality gate, no per-user cap. Two sockpuppets suppress any content instantly.
- **Invite-code enumeration.** `classrooms/by-code/[code]` is unauthenticated with no rate limit and returns name/subject/student count; `join` has no rate limit. Entropy is good (31^6) but with thousands of classrooms ~10^5 requests hits one. Persisted per-IP limit on both.

---

## 3. Low / hygiene
- `lib/marking/share-token.ts:29-34` and `lib/community/email-unsubscribe.ts:19-25,62`: signing secrets fall back to `CRON_SECRET` / service-role key / a hard-coded dev string; unsubscribe compare is `!==` not `timingSafeEqual`. Require explicit secrets in prod and add them to `/api/health`.
- `lib/marking/grade-thresholds.ts:48-49`: the table's `A` value is used as the **A\*** boundary and `A-4` as A; non-Cambridge codes get Cambridge defaults with a Cambridge note. Rename keys or fix mapping.
- `app/auth/signout/route.ts:30`: GET sign-out → CSRF logout via `<img>`. Make it POST.
- `app/api/health/route.ts:41-47`: unauthenticated disclosure of env presence, enforcement mode, build SHA.
- `lib/billing/enforcement-mode.ts:267-271`: `ENFORCEMENT_MODE` defaults to `off`, and `enforcement.ts:519-536` fails open on RPC error. Default to `enforce` in production.
- `order.refunded` before `order.paid` grants the full pack; Max welcome credits (`lib/max/gifts.ts:101-113`) never clawed back on revoke; `hasFirstMarkPremium` re-grants if the first mark fails before the attempt row is saved.
- `checkout/route.ts:40-42,86`: `successUrl` from the `Origin` header; use `resolveSiteUrl()`.
- `lib/community/sanitize.ts:38`: single-pass `javascript:` strip is bypassable (`javajavascript:script:`); harmless only because `safeUrl` is the real gate.
- `mark-runner.ts findMarkSchemeRow` fallback does `select('*')` over every question of the paper (full scheme JSON) to normalise a question number in JS; also reached by unauthenticated `/api/mark/question-detail`.
- `process/route.ts`: no explicit page-count/size/MIME validation on `pages*`; client `file.type` forwarded into Gemini and into storage `contentType` (HTML stored as `text/html` on the storage origin). Allowlist mime types; cap page count client and server side.
- `lib/marking/page-detection.ts:8`: label regex matches maths like "2 (x+1)"; roman-numeral parts sort lexically; segments "3(a)" never match a page labelled "3".
- `system-prompts.ts:141,149`: `.toFixed(0)` on client-supplied numbers throws after `recordOmniUsage` has charged. Validate `context` before metering.
- `lib/plan/ics.ts:17`: escape lone `\r`. `community/username` check-then-upsert → 500 on race (catch 23505 → 409). `community/search` needs a length cap on `q`.
- Self-assignable teacher role (`save-profile.ts:51`) is by design but unlocks the override route; document it.
- Frontend: duplicated `setLoading(false); releaseSubmit(); setMarkProgress(null)` at `page.tsx:1918/1938`; blob URLs never revoked on remove/reset (`PageUploader.tsx:493`); HEIC passes through on Android; 4 MB cap only checked at submit; `components/mark-flow` v2 duplicates paper-questions fetch, session parsing and total-marks validation, and its reducer guard has diverged from the UI's; `lib/marking/mark-deep-link.ts` has a test but no module.
- Stale comments citing a 300s limit (`mark-run-log.ts:337-340`, `single-question-pipeline.ts` caps). `vercel.json` lists `maxDuration` only for `run` and `process`; confirm `init`/`retry` honour the route export on Fluid Compute.
- Lint: 51 warnings (21 unused vars, 5 hook deps). `dead:components` reports 4 unreferenced of 710.
- Plausible, needs live check: base RLS for `user_profiles`/`attempts` predates the migrations directory (confirm arbitrary authenticated users cannot read other profiles' email/target grade); ~20 older migrations revoke SECURITY DEFINER functions from `anon, authenticated` but not `PUBLIC`, so a preview DB built by replay exposes them. Run `pnpm test:grants` on every environment.

---

## 4. What is solid (calibration)
- **Marking pipeline design.** Request-scoped wall-clock budget (`withRequestDeadline` + AsyncLocalStorage) with per-call timeout clamping, one-shot backend failover, retry budget guard; reservation settled exactly once; `mark_runs` telemetry opened before the first model call and swept if abandoned; survives client disconnect and emails the result.
- **Mark integrity.** `reconcile-marks` owns all arithmetic (authoritative denominators, ratio scaling on inflated totals, catalog criteria rebuild); verify pass gated on a comparable result; median-of-three tiebreak on essays; band-contradiction re-mark; refusal on citations that are not in the script; Flash→Pro OCR escalation; `INJECTION_GUARD_BLOCK` on every marking and verify prompt; JSON mode plus escape repair before `jsonrepair`; derived schemes cached insert-only with race handling and unstable rubrics never cached.
- **Auth/authz.** Uniform `authenticateRouteRequest` → 401; every service-role read of user data filtered by the verified user id; teacher routes check role + classroom ownership; all 13 crons behind `CRON_SECRET`; svix on the Resend webhook; RLS on every table created in migrations with deny-all on service tables; column-level grants and `audit_client_grants` with `pnpm test:grants`; markdown without `rehype-raw`, protocol-allowlisted links, KaTeX `trust:false`; SameSite=Lax cookies block JSON-CSRF.
- **Billing.** Polar signature verified through `standardwebhooks` on the raw body; inbox lease idempotency; `externalId = user.id` set server-side, no client-chosen products; `reserve_mark_usage` under a per-user advisory lock; RPCs revoked from anon/authenticated; portal scoped to the caller.
- **Storage.** Answer photos in a private bucket under user-prefixed paths, signed for 1 h at the API boundary.
- **Frontend.** SSE parsing handles partial chunks and heartbeats; per-submit run id + AbortController with every state write gated on the current run; stale rewrite guarded by attempt id; pre-stream 400/402/429 handled; FormData names all match the server; Cinematic experience correctly lazy; no `dangerouslySetInnerHTML` on the mark path.
- **Engineering hygiene.** Extensive rationale comments citing production incidents; small pure helpers with unit tests; typecheck/lint/test CI on every PR; `pnpm dead:components`, `audit:component-types`, `marking:health`, `mark:smoke` all exist.

---

## 5. Suggested order
1. `auth-redirect.ts` backslash fix + same-origin assert at sinks (30 min).
2. Remove/replace the onboarding save-token session restore (half a day).
3. Yearly billing window (2 h) and `syncSubscription` ordering guard (2 h).
4. Whole-paper: merge on failure, per-page PDF OCR, rethrow deadline in the Safe wrapper, release when all failed (half a day).
5. Atomic guest rate-limit RPC consumed up front; auth or persisted limit on teach-back; delete the legacy whole-paper branch in `process` (half a day).
6. Send `client_request_id` from the page, handle `duplicate:true`, scope the unique index by user (half a day).
7. Then the Medium list, starting with credit reservation, leaked reservations, seat-aware feature gates, community attachment binding, override bounds, Omni caps.
