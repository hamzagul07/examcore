/**
 * Acquisition funnel events — the MarkScheme equation:
 * organic → mark attempt → completed mark → account → paid
 *
 * Dual-writes to GA4 (when configured) and first-party /api/track so we can
 * measure the loop even without GA.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export type FunnelEvent =
  | 'landing_view'
  | 'mark_cta_clicked'
  | 'answer_input_started'
  | 'answer_submitted'
  | 'mark_result_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'upgrade_viewed'
  | 'checkout_started'
  | 'subscription_started'

export type FunnelProps = {
  subject?: string | null
  source?: string | null
  path?: string | null
  attemptId?: string | null
  board?: string | null
  [key: string]: string | number | boolean | null | undefined
}

const STARTED_KEY = 'ms_funnel_answer_started'

function sessionId(): string | null {
  try {
    const key = 'ms_sid'
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : null
    if (!id) return null
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

function beaconPath(event: FunnelEvent): string {
  return `/__funnel/${event}`
}

export function trackFunnelEvent(event: FunnelEvent, props: FunnelProps = {}): void {
  if (typeof window === 'undefined') return

  const path = props.path ?? window.location.pathname
  const payload = {
    ...props,
    path,
    event,
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', event, {
      ...payload,
      page_path: path,
    })
  }

  const sid = sessionId()
  if (!sid) return
  const body = JSON.stringify({
    path: beaconPath(event),
    dwellMs: 0,
    sessionId: sid,
    referrer: document.referrer || '',
    utmSource: props.source ?? '',
    utmMedium: 'funnel',
    utmCampaign: event,
    utmContent: props.subject ?? '',
    utmTerm: props.attemptId ?? '',
  })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    /* fall through */
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

/** Fire once per tab when the student first interacts with answer input. */
export function trackAnswerInputStarted(props: FunnelProps = {}): void {
  try {
    if (sessionStorage.getItem(STARTED_KEY) === '1') return
    sessionStorage.setItem(STARTED_KEY, '1')
  } catch {
    /* still fire */
  }
  trackFunnelEvent('answer_input_started', props)
}
