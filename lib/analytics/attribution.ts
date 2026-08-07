/**
 * First-touch attribution, captured in the browser.
 *
 * Where a visitor came from is decided exactly once — on the landing page — and
 * every later pageview in the session inherits it. Reading it on each route
 * change would be wrong twice over: `document.referrer` becomes the previous
 * *internal* page after a client-side navigation, and the UTM query string is
 * gone the moment the visitor clicks anything. So it is read once and parked in
 * sessionStorage.
 *
 * Deliberately session-scoped, not a cookie: it dies with the tab, which keeps
 * this a measurement of a visit rather than a durable identifier for a person.
 */

const ATTR_KEY = 'ms_attr'

export type FirstTouch = {
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
}

const EMPTY: FirstTouch = {
  referrer: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
}

/** UTM values are pasted by hand into outreach links; keep them short and sane. */
function param(sp: URLSearchParams, name: string): string {
  const v = sp.get(name)
  return v ? v.slice(0, 128) : ''
}

/**
 * A same-origin referrer is navigation, not attribution — it must never
 * overwrite the source that actually brought the visitor to the site. Anything
 * unparseable is treated as no referrer rather than guessed at.
 */
function externalReferrer(): string {
  try {
    const raw = document.referrer
    if (!raw) return ''
    const host = new URL(raw).host
    if (!host || host === window.location.host) return ''
    return raw.slice(0, 512)
  } catch {
    return ''
  }
}

function read(): FirstTouch | null {
  try {
    const stored = sessionStorage.getItem(ATTR_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<FirstTouch>
    return { ...EMPTY, ...parsed }
  } catch {
    return null
  }
}

/**
 * The first-touch for this session, capturing it on first call.
 *
 * Returns EMPTY where sessionStorage is unavailable (private mode, blocked
 * storage) rather than throwing — losing attribution for one visit is a far
 * better outcome than a tracker that breaks the page it is measuring.
 */
export function firstTouch(): FirstTouch {
  if (typeof window === 'undefined') return EMPTY

  const existing = read()
  if (existing) return existing

  let captured: FirstTouch = EMPTY
  try {
    const sp = new URLSearchParams(window.location.search)
    captured = {
      referrer: externalReferrer(),
      utmSource: param(sp, 'utm_source'),
      utmMedium: param(sp, 'utm_medium'),
      utmCampaign: param(sp, 'utm_campaign'),
      utmContent: param(sp, 'utm_content'),
      utmTerm: param(sp, 'utm_term'),
    }
  } catch {
    return EMPTY
  }

  try {
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(captured))
  } catch {
    // Unstorable — still return what was captured so at least the landing
    // pageview of this session carries its source.
  }
  return captured
}
