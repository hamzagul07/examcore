import { Polar } from '@polar-sh/sdk'

// Lazy initialization, mirroring lib/stripe/server.ts. We must NOT touch
// POLAR_ACCESS_TOKEN at module load: Next.js imports every API route during
// `next build` to collect page data, and the token is legitimately absent until
// Polar is configured. Throwing at import time crashes the build. Instead we
// create the client on first use, so a missing token only errors when a billing
// endpoint is actually hit.
let cachedPolar: Polar | null = null

/** 'sandbox' unless POLAR_SERVER is explicitly 'production'. */
export function polarServer(): 'sandbox' | 'production' {
  return process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
}

export function getPolar(): Polar {
  if (cachedPolar) return cachedPolar

  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error(
      'POLAR_ACCESS_TOKEN is not set. Set it in environment variables before using Polar features.'
    )
  }

  cachedPolar = new Polar({ accessToken, server: polarServer() })
  return cachedPolar
}

// Backwards-compat ergonomics matching lib/stripe/server.ts: callers do
// `import { polar } from '@/lib/polar/server'` then `polar.checkouts.create(...)`.
// The Proxy defers to getPolar() on first property access, so call sites stay
// lazy (no client created until a property is read).
export const polar = new Proxy({} as Polar, {
  get(_target, prop) {
    return Reflect.get(getPolar() as object, prop)
  },
})

/**
 * Redact a Polar SDK error to only the safe fields before logging.
 *
 * The SDK's thrown error object embeds the outgoing request — including the
 * `Authorization: Bearer polar_oat_...` header — under `request$`/`data$`.
 * Passing the raw error to `console.error` leaks the org access token into
 * logs. Always log `polarErrorForLog(err)` instead of the raw error.
 */
export function polarErrorForLog(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') {
    return { message: String(err) }
  }
  const e = err as Record<string, unknown>
  return {
    name: typeof e.name === 'string' ? e.name : e.constructor?.name,
    message: typeof e.message === 'string' ? e.message.slice(0, 500) : undefined,
    statusCode: e.statusCode,
    error: e.error,
    detail: e.detail,
  }
}
