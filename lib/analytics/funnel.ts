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
  | 'lead_captured'
  | 'upgrade_viewed'
  | 'checkout_started'
  | 'subscription_started'
  | 'vault_opened'

export type FunnelProps = {
  subject?: string | null
  source?: string | null
  path?: string | null
  attemptId?: string | null
  board?: string | null
  [key: string]: string | number | boolean | null | undefined
}

const STARTED_KEY = 'ms_funnel_answer_started'
/** Last board selected on /mark — used by signup/upgrade events after leave. */
const LAST_BOARD_KEY = 'ms_funnel_last_board'

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

function sanitizeBoardSegment(board: string): string {
  return board.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 32)
}

function beaconPath(event: FunnelEvent, board?: string | null): string {
  const b = board ? sanitizeBoardSegment(board) : ''
  return b ? `/__funnel/${event}/${b}` : `/__funnel/${event}`
}

/** Remember board for later signup/upgrade events in this tab. */
export function rememberFunnelBoard(board: string | null | undefined): void {
  if (typeof window === 'undefined' || !board) return
  try {
    sessionStorage.setItem(LAST_BOARD_KEY, sanitizeBoardSegment(board))
  } catch {
    /* ignore */
  }
}

export function lastFunnelBoard(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(LAST_BOARD_KEY)
  } catch {
    return null
  }
}

/** Map /mark funnel board id → user_profiles.board / onboarding BOARDS id. */
export function profileBoardFromFunnelBoard(
  funnelBoard: string | null | undefined
): string | null {
  const b = funnelBoard?.trim().toLowerCase()
  if (b === 'edexcel') return 'Edexcel'
  if (b === 'ib') return 'IB'
  if (b === 'cambridge') return 'Cambridge International'
  if (b === 'oxfordaqa') return 'OxfordAQA'
  if (b === 'aqa') return 'AQA'
  if (b === 'ap') return 'AP'
  return null
}

export function trackFunnelEvent(event: FunnelEvent, props: FunnelProps = {}): void {
  if (typeof window === 'undefined') return

  const board = props.board ?? lastFunnelBoard()
  if (props.board) rememberFunnelBoard(props.board)

  const path = props.path ?? window.location.pathname
  const payload = {
    ...props,
    board: board ?? props.board ?? null,
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
    path: beaconPath(event, board),
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
