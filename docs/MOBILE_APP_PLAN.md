# MarkScheme Mobile App — Implementation Phases

_Cross-platform iOS + Android app. Two core features: the Reddit-style community and marking-by-camera. Everything else points to the website. Written 2026-09-06; no code exists yet — this is the build roadmap._

## Scope

**In the app:**

1. **Community** — the same Reddit-style experience as the website: feed of posts / questions / notes, nested comments, voting, accepted answers, search, notifications.
2. **Marking by camera** — photograph a handwritten answer, upload, get the marked result with breakdown and examiner feedback.
3. **Table stakes** — sign up / sign in (email, Google, Apple), onboarding, profile, settings, push notifications, account deletion.

**Not in the app (deliberately):** courses, study loop, past-paper browsing as a study surface, payments. These appear as cards that open the website in the browser.

## Architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native + TypeScript) + Expo Router** | Same language and ecosystem as the web app; `supabase-js` works natively; EAS handles builds, store submission, and OTA updates |
| Repo | **`mobile/` folder in this repo** | Shares types/constants with web code, one history; the Expo app has its own `package.json` and is invisible to the Next.js build |
| Backend | **None new.** Reuse existing API routes + Supabase; the app sends the Supabase JWT as `Authorization: Bearer` | One backend to maintain; RLS already exists |
| Styling | **NativeWind** with the warm-paper design tokens ported | Tailwind mental model carries over from the web codebase |
| Data layer | **TanStack Query** + `supabase-js`, session in `expo-secure-store` | Caching, optimistic votes, offline reads |
| Payments (v1) | **Sell nothing in-app.** Premium entitlements sync from the account; Polar stays web-only | Sidesteps Apple IAP and anti-steering rules entirely at launch |

### Backend surface the app reuses (verified in this repo)

- **Community:** `/api/community/posts` (+ `[id]/vote`, `[id]/comments`), `questions` (+ `vote` / `accept` / `answers`), `notes` (+ `vote` / `save`), `answers/[id]/vote`, `search`, `notifications`, `report`, `username`, `upload`. Feature flag: `lib/community/enabled.ts` (`COMMUNITY_ENABLED`).
- **Marking:** `/api/mark/process`, `run-status`, `feedback`, `question-detail`, `paper-questions`, `starter-question`, `topic-question`, `solution`, `share`, `whole-paper/*`.
- **Auth helper:** `authenticateRouteRequest` in `lib/supabase-server.ts` — the only correct auth for multipart/FormData routes.
- Marking already completes server-side after a client disconnects and emails the result — exactly what a mobile app needs, since users will background the app during the ~3-minute mark.

---

## Phase 0 — Accounts, tooling, foundation (~1 week)

- [ ] Apple Developer Program + Google Play Console enrollment; reserve bundle IDs (e.g. `com.markscheme.app`)
- [ ] EAS project with build profiles: dev / internal / store
- [ ] Scaffold Expo app in `mobile/`: TypeScript, ESLint, env handling, Sentry
- [ ] Port design tokens (warm-paper palette, type scale, spacing) into the NativeWind theme; app icon + splash screen
- [ ] CI: EAS build on merge, internal distribution channel

**Exit criteria:** a blank branded app installs on a real iPhone and a real Android device from an EAS build.

## Phase 1 — Backend readiness audit (parallel with Phase 0, ~1 week)

The single biggest integration risk: web routes authenticate via **cookies**; the app sends **bearer tokens**.

- [ ] Audit every endpoint listed above for bearer-token auth; retrofit to `authenticateRouteRequest` where needed. `/api/mark/process` is the critical one — known gotcha: `createClient()` on a FormData route silently nulls `user_id`
- [ ] RLS audit for any direct Supabase reads from the app (known gotcha: the `attempts` SELECT policy calls `teacher_student_ids()`, which needs authenticated EXECUTE)
- [ ] New endpoint: **app config** — feature flags (incl. `COMMUNITY_ENABLED`) and minimum-supported-app-version for forced upgrades
- [ ] New endpoint: **block user** — Apple requires user blocking for UGC apps; `report` exists, block does not
- [ ] Push infrastructure: device-tokens table + send helper; wire push into the three marking notify paths (alongside the existing email) and community replies
- [ ] Rate-limiting / abuse posture for non-browser clients

**Exit criteria:** a written mobile API contract; every listed endpoint verified with a bearer token via curl.

## Phase 2 — App shell, auth, profile (~2–3 weeks)

- [ ] Bottom-tab navigation: **Community / Mark / Profile** (Expo Router)
- [ ] Deep links + universal links so website URLs open the app
- [ ] Auth: email + password, Google, **Sign in with Apple** (mandatory on iOS once any social login exists); password reset; session persisted in `expo-secure-store`
- [ ] Onboarding: exam board, subjects, target grade (target grades are a known activation lever)
- [ ] Profile: community username (reuse `/api/community/username`), avatar, settings, notification preferences, sign out
- [ ] **In-app account deletion** (hard requirement on both stores)
- [ ] Legal screens: ToS, privacy policy, 13+ age gate
- [ ] "On the website" pattern for courses/past papers: informational cards that open the browser — never framed as a paywall pointer

**Exit criteria:** a new user can install, sign up, complete onboarding, edit their profile, and delete their account.

## Phase 3 — Community, Reddit-style (~3–4 weeks)

- [ ] Feed: hot / new / top sort, subject filters, infinite scroll, pull-to-refresh, covering all three content types (posts / questions / notes)
- [ ] Detail views: nested comments, optimistic voting, accepted answers on questions, save on notes
- [ ] Composer: post / question / answer / comment; image attach via `/api/community/upload`
- [ ] Search (`/api/community/search`); notification inbox (`/api/community/notifications`) + push for replies
- [ ] **Math rendering:** KaTeX strategy for React Native (WebView-based renderer for LaTeX-bearing bodies). The site runs a 3-renderer pipeline; this is the top UI risk — prototype it in week 1 of this phase
- [ ] **UGC compliance (App Store Guideline 1.2):** report content (exists), block users (from Phase 1), terms agreement before first post, defined moderation turnaround. Apple rejects UGC apps missing any of these
- [ ] Offline read cache; complete empty / loading / error states

**Exit criteria:** a student can browse, search, post, comment, vote, report, and block entirely from the app.

## Phase 4 — Marking by camera (~3–4 weeks)

- [ ] Question selection: search / paper / topic pickers reusing `question-detail`, `paper-questions`, `starter-question`, `topic-question`
- [ ] Capture flow: multi-page camera with crop / rotate / retake, gallery import, client-side compression
- [ ] Guard the #1 failure mode: 57% of marking failures are a missing mark total, so the flow must structurally guarantee question + total marks are known (a picked question, or a prompted "include the question in the shot")
- [ ] Upload multipart to `/api/mark/process` with bearer auth; poll `run-status`
- [ ] **Push: "Your marks are ready"** — the server already finishes marks after disconnect and emails, so backgrounding or killing the app mid-mark is safe
- [ ] Results screen: total, per-criterion breakdown, examiner feedback (KaTeX again), share via `/api/mark/share`, attempt history via `/api/attempts`
- [ ] Entitlements: same meter as web (guest / free / paid); meter hidden for premium users (premium-feel rule)
- [ ] Telemetry parity with `mark_runs` / `mark_feedback` so the activation funnel covers mobile

**Exit criteria:** photograph a handwritten answer → marked result with breakdown on the phone, including when the app is killed mid-mark.

## Phase 5 — Monetization stance + store compliance (~1–2 weeks)

- [ ] v1 sells **nothing** in-app; premium status syncs from the account
- [ ] No "buy on our website" CTAs in the iOS build (Apple 3.1.1 anti-steering; the Netflix/Spotify "we simply don't sell here" posture is the safe launch position). Revisit IAP post-launch (e.g. RevenueCat reconciled with Polar entitlements) as its own project
- [ ] Privacy nutrition labels (iOS) + Data Safety form (Play)
- [ ] Compliance sweep: account deletion works, Sign in with Apple present, UGC moderation evidence ready, age rating set, no ATT prompt needed if there's no cross-app tracking
- [ ] Store listings: screenshots, ASO keywords, support URL, privacy URL

## Phase 6 — Beta, launch, operations (~2 weeks + ongoing)

- [ ] Internal QA → TestFlight + Play closed track with real students; fix cycle
- [ ] Maestro E2E for the two golden paths: sign-up → first mark, and browse → post
- [ ] Sentry crash triage; analytics events for the mobile activation funnel
- [ ] OTA update policy: EAS Update for JS-only fixes, store releases for native changes; forced-upgrade path via the Phase-1 config endpoint
- [ ] Submit to both stores (expect one UGC-related review round-trip on iOS)
- [ ] Launch; in-app review prompt after a successful mark; post-launch metrics + iteration backlog

---

## Timeline

**~12–16 weeks to public launch** run sequentially. Phases 3 and 4 are independent and can run in parallel, compressing to **~9–11 weeks**.

## Top risks

1. **KaTeX / math rendering in React Native** — prototype in week 1 of Phase 3; the community and marking results are both math-heavy
2. **Apple UGC review** — block-user + moderation evidence must exist before submission, not after a rejection
3. **Bearer-auth retrofits** — silent `user_id` nulling on multipart routes has bitten this codebase before
4. **Camera image quality vs marking accuracy** — the capture flow must enforce mark-total presence, or mobile will amplify the existing top failure mode
5. **"Go to website" framing** — must read as informational, never as steering around Apple's IAP rules
