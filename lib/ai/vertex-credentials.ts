import { existsSync, writeFileSync } from 'fs'
import { homedir, platform, tmpdir } from 'os'
import { isAbsolute, join } from 'path'

let materialized = false

/**
 * Resolve a credentials path for the current OS.
 * - Expands `~` to the user home directory (macOS/Linux).
 * - Resolves project-relative paths (e.g. `.gcp/key.json`) from process.cwd().
 * - Converts `C:/Users/...` Windows paths when running on macOS/Linux
 *   (common when moving a project from Windows to Mac).
 */
export function resolveCredentialsPath(raw: string): string {
  let path = raw.trim()
  if (!path) return path

  if (path === '~' || path.startsWith('~/')) {
    path = join(homedir(), path === '~' ? '' : path.slice(2))
  } else if (!isAbsolute(path)) {
    path = join(process.cwd(), path)
  }

  if (platform() !== 'win32') {
    const winUsersMatch = path.match(/^[A-Za-z]:\/Users\/(.+)$/i)
    if (winUsersMatch) {
      path = join('/Users', winUsersMatch[1])
    }
  }

  return path
}

/**
 * Vercel/serverless has no file path for a service-account JSON key.
 * Materialize GOOGLE_APPLICATION_CREDENTIALS_JSON into /tmp for ADC.
 */
export function ensureVertexApplicationCredentials(): void {
  if (materialized) return

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (credPath) {
    const resolved = resolveCredentialsPath(credPath)
    if (resolved !== credPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = resolved
    }
    if (!existsSync(resolved)) {
      console.warn(
        `[vertex] Credentials file not found: ${resolved}. ` +
          'Copy your service account JSON to this path (e.g. mkdir -p ~/.gcp && cp key.json ~/.gcp/markscheme-vertex-ai.json).'
      )
    }
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
