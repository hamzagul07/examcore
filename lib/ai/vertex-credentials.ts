import { existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let materialized = false

/**
 * Vercel/serverless has no file path for a service-account JSON key.
 * Materialize GOOGLE_APPLICATION_CREDENTIALS_JSON into /tmp for ADC.
 */
export function ensureVertexApplicationCredentials(): void {
  if (materialized) return

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    materialized = true
    return
  }

  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
    process.env.GCP_SERVICE_ACCOUNT_JSON?.trim()

  if (!raw) return

  try {
    JSON.parse(raw)
    const path = join(tmpdir(), 'examcore-vertex-sa.json')
    if (!existsSync(path)) {
      writeFileSync(path, raw, { mode: 0o600 })
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path
    materialized = true
  } catch (err) {
    console.error('[vertex] Invalid service account JSON env var', err)
  }
}
