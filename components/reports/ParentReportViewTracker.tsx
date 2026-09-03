'use client'

import { useEffect, useRef } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { PREVIEW_PARAM } from '@/lib/reports/preview-param'

/**
 * Fires once when a shared progress report is opened.
 *
 * Paired with `parent_report_shared` on the student's side: the ratio between
 * the two is the only evidence that students actually send the link, which is
 * the assumption this whole surface rests on.
 */
export function ParentReportViewTracker() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    // The student's own "see what they'll see" preview is not a parent opening
    // the link. Counting it would put a share and a view on every preview, and
    // a 1:1 ratio would then be indistinguishable from "nobody ever sends it"
    // — the exact question this pair of events exists to answer.
    if (new URLSearchParams(window.location.search).has(PREVIEW_PARAM)) return
    trackFunnelEvent('parent_report_viewed', {
      source: 'parent_report',
      // Never the real pathname: it carries the share token, and this value is
      // forwarded to GA as page_path.
      path: '/p',
    })
  }, [])
  return null
}
