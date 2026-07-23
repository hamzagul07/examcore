/**
 * Session Replay lives in its own module so the bundler can split it into a
 * separate async chunk. `instrumentation-client.ts` imports this lazily (after
 * idle) instead of pulling `replayIntegration` into the first-load bundle — the
 * Replay code (~100+ KiB) is unused until an error is captured.
 */
import { replayIntegration } from '@sentry/nextjs'

export function makeReplayIntegration() {
  return replayIntegration()
}
