import { after } from 'next/server'

/**
 * Run deferred work that must outlive the response.
 *
 * `void someAsyncFn()` races the platform: once the handler returns, the
 * instance can be frozen and any in-flight work goes with it. `after()` fixes
 * that — but only if it is called *while the request is still open*.
 *
 * That caveat is the whole reason this helper exists. `after()` queues the
 * callback and drains the queue exactly once, when the response closes. A
 * request whose first `after()` lands after that drain never re-arms the close
 * hook, so the callback is silently dropped — no throw, no log. `void fn()`
 * where `fn` awaits anything before sending an email hits exactly that case:
 * the `after()` inside the send helper runs a network round-trip too late.
 *
 * So wrap the call, not the send. `runAfterResponse(() => fn())` registers
 * synchronously, holding the queue open for everything `fn` does later.
 *
 * Outside a request scope (scripts, cron, tests) `after()` throws and the work
 * runs inline — correct, because those callers stay alive on their own.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>): void {
  const run = () =>
    task().catch((err) => {
      console.error(`[after-response] ${label} failed:`, err)
    })

  try {
    after(run)
  } catch {
    void run()
  }
}
