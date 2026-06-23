# Vertex AI migration

Examcore can call Gemini through **two backends**. Switch with `USE_VERTEX_AI` in `.env.local`.

| Backend | Auth | Quotas | When to use |
|---------|------|--------|-------------|
| **Vertex AI** (`USE_VERTEX_AI=true`) | Service account JSON via `GOOGLE_APPLICATION_CREDENTIALS` | Dynamic Shared Quota (DSQ) — no fixed daily cap | **Production bulk extraction**, lesson generation, marking |
| **Gemini API** (default) | `GEMINI_API_KEY` | Per-key daily limits (e.g. 1,000 Pro req/day) | Local dev fallback, quick tests |

## Setup (Vertex AI)

1. **Enable APIs** in [Google Cloud Console](https://console.cloud.google.com/):
   - Vertex AI API (`aiplatform.googleapis.com`)
   - Billing enabled on the project

2. **Create a service account**
   - IAM → Service Accounts → Create
   - Role: **Vertex AI User** (`roles/aiplatform.user`)
   - Keys → Add key → JSON → save outside the repo

3. **Add to `.env.local`** (never commit the key file):

```env
USE_VERTEX_AI=true
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/vertex-sa-key.json
```

**Vercel / serverless:** file paths do not work. Set `GOOGLE_APPLICATION_CREDENTIALS_JSON` to the full service-account JSON string (single line). The app writes it to `/tmp` at runtime for ADC.

```env
USE_VERTEX_AI=true
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

4. **Region:** `us-central1` is the default (`GOOGLE_CLOUD_LOCATION`) for best DSQ availability.

## Model IDs

Task routing is unchanged — `modelForTask('content-generation')` still returns Pro vs Flash.

| Tier | Model ID (Vertex + API) | Tasks |
|------|-------------------------|-------|
| Pro | `gemini-2.5-pro` | `content-generation`, `pdf-extraction`, `syllabus-extraction`, … |
| Flash | `gemini-2.5-flash` | `topic-tagging`, `marking`, `ocr`, `latex-validation`, … |

GA Vertex models use the same IDs as the Gemini API (no `-002` suffix for 2.5 GA).  
Docs: [Gemini 2.5 Pro on Vertex](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro)

## Code paths

| File | Role |
|------|------|
| `lib/ai/gemini-config.ts` | `USE_VERTEX_AI`, project, region helpers |
| `lib/ai/gemini-models.ts` | `modelForTask()` — unchanged API |
| `lib/ai/gemini-text.ts` | `getGeminiClient()` — Vertex or API key `@google/genai` client |
| `lib/ai/gemini-smoke.ts` | Flash / Pro / tagging / PDF smoke tests |

**Package note:** `@google-cloud/vertexai` is installed for GCP auth compatibility. The active client uses `@google/genai` with `vertexai: true` (Google's recommended migration path; the legacy `VertexAI` class in `@google-cloud/vertexai` is deprecated June 2026).

## Fallback (Gemini API)

Unset or `USE_VERTEX_AI=false` and set:

```env
GEMINI_API_KEY=your-key
```

All callers using `getGeminiClient()` / `generateGeminiText()` automatically use the API key path.

## Smoke test

```bash
npx tsx scripts/gemini-smoke.mjs
```

Runs: Flash ping → Pro ping → tagging JSON → minimal PDF multimodal.

Extraction pipeline also smoke-tests on startup:

```bash
pnpm extract:paper cambridge/9702/m24/qp_12.pdf
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `GOOGLE_CLOUD_PROJECT is required` | Set project ID in `.env.local` |
| `Could not load the default credentials` | Check `GOOGLE_APPLICATION_CREDENTIALS` path; SA needs Vertex AI User |
| `403 Permission denied` | Enable Vertex AI API; grant `roles/aiplatform.user` on the project |
| `404 model not found` | Confirm model ID spelling; check region supports `gemini-2.5-pro` |
| Still hitting 429 daily quota | Verify `USE_VERTEX_AI=true` is loaded (restart dev server / re-run script) |

## Bulk extraction

After migrating, restart bulk extract with Vertex enabled:

```bash
npx tsx scripts/bulk-extract-sessions.mjs --sessions=m22,s22,w22,s23,w23 --subject=9702 --concurrency=2
```

Quota-pause state (API-key path only) lives in `tmp/bulk-extraction-state.json` — not needed when DSQ is active on Vertex.
