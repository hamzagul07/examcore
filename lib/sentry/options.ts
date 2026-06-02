/** Shared Sentry options — only active when a DSN is configured. */

export function isSentryEnabled(): boolean {
  return Boolean(
    process.env.SENTRY_DSN?.trim() ||
      process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  )
}

export function getSentryDsn(): string | undefined {
  return (
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  )
}

export const sentryBaseOptions = {
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate:
    process.env.NODE_ENV === 'production'
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1')
      : 0,
  sendDefaultPii: false,
}
