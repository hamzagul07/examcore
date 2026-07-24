import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry/options'

Sentry.init({
  ...sentryBaseOptions,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.25 : 0,
})

// Session Replay is a large integration (~100+ KiB, and its rrweb recording is
// hundreds of ms of main-thread work) that does nothing until an error fires. We
// keep it out of the first-load bundle AND off the initial main thread by loading
// it only on the first real user interaction — by which point the page is
// interactive and a few hundred ms of setup is invisible. Trade-off: an error
// before the user ever touches the page won't have a replay attached — acceptable
// given session replays are already sampled at 0.
if (typeof window !== 'undefined' && sentryBaseOptions.enabled) {
  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
  let loaded = false
  const loadReplay = () => {
    if (loaded) return
    loaded = true
    events.forEach((e) => window.removeEventListener(e, loadReplay))
    import('@/lib/sentry/replay')
      .then(({ makeReplayIntegration }) => {
        Sentry.getClient()?.addIntegration(makeReplayIntegration())
      })
      .catch(() => {
        /* Replay is best-effort — never let it break the app. */
      })
  }
  events.forEach((e) =>
    window.addEventListener(e, loadReplay, { once: true, passive: true }),
  )
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
