import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 0,
})

// Session Replay is a large integration (~100+ KiB) that does nothing until an
// error fires, so we keep it out of the first-load bundle and attach it once the
// browser is idle. Trade-off: errors in the first moment after load won't have a
// replay attached — acceptable given session replays are already sampled at 0.
if (typeof window !== 'undefined' && sentryBaseOptions.enabled) {
  const loadReplay = () => {
    import('@/lib/sentry/replay')
      .then(({ makeReplayIntegration }) => {
        Sentry.getClient()?.addIntegration(makeReplayIntegration())
      })
      .catch(() => {
        /* Replay is best-effort — never let it break the app. */
      })
  }
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
  }
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(loadReplay, { timeout: 3000 })
  } else {
    w.setTimeout(loadReplay, 2000)
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
