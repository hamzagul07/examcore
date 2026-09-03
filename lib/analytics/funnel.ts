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
  /**
   * The marked example on /mark was opened.
   *
   * MarkExample exists because of a measurement — most people who opened /mark
   * spent about a minute and left without uploading anything, so they bounced
   * off an empty uploader rather than off the wait. The fix for that was never
   * instrumented, so whether it works has been unanswerable.
   *
   * It also settles a real placement question. MK-01 puts the example BELOW the
   * capture path so the first viewport leads with upload rather than banners,
   * which is a sound instinct about banner blindness — but the bounce it treats
   * happens at the uploader, above where the antidote sits. With this event and
   * `answer_input_started`, that is an A/B test rather than an argument.
   */
  | 'example_opened'
  | 'answer_input_started'
  | 'answer_submitted'
  | 'mark_result_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'lead_captured'
  | 'upgrade_viewed'
  /** A contextual premium card's CTA was clicked (see PostMarkPremiumCard). */
  | 'upsell_clicked'
  | 'checkout_started'
  | 'subscription_started'
  | 'vault_opened'
  /**
   * The parent-facing progress report (/p/[token]).
   *
   * A separate funnel with a separate buyer, so it is counted separately:
   * `shared` is the student generating the link, `viewed` is somebody opening
   * it. The ratio between them is the only way to tell whether students are
   * actually sending it, which is the assumption the whole surface rests on.
   */
  | 'parent_report_shared'
  | 'parent_report_viewed'
  /**
   * A signed-out visitor clicked a plan and was sent to sign up instead.
   *
   * The strongest purchase signal the product can receive, and it was not
   * recorded anywhere: `checkout_started` fires after the signed-in check, so
   * every signed-out attempt was invisible. 59% of pricing sessions are signed
   * out, which made the cost of the signup wall unmeasurable and therefore
   * un-arguable. This is the numerator that was missing.
   */
  | 'checkout_signup_required'
  /**
   * A visitor with nothing in hand took a real past-paper question.
   *
   * The counterweight to `example_opened`: one is reading what marking looks
   * like, the other is attempting it. 1,300 sessions opened /mark in 30 days,
   * 93 wrote anything and 16 opened the example — so the size of this number
   * against those is the test of whether handing over a question is what the
   * other 1,207 were missing.
   */
  | 'starter_question_taken'

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
