import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 0,
})

// Session Replay is a large integration (~100+ KiB, and its rrweb recording is
// hundreds of ms of main-thread work) that does nothing until an error fires.
// It used to load on the first user interaction — but 'scroll' was one of the
// trigger events, so its ~1s of chunked setup landed on the visitor's FIRST
// scroll, stacking with the landing demo's lazy mount into one multi-second
// freeze (the B5 jank). Idle is the one moment guaranteed not to compete with
// an interaction, and for a reader it usually arrives BEFORE their first
// touch. Trade-off unchanged from the interaction version: an error before
// the integration loads has no replay attached — acceptable given session
// replays are already sampled at 0.
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
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(loadReplay, { timeout: 15000 })
  } else {
    window.setTimeout(loadReplay, 8000)
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
