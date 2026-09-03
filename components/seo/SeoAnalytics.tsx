import Script from 'next/script'

/**
 * Optional GA4 — set NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel.
 * Use GSC for rankings; GA4 for landing-page conversions and blog CTR paths.
 */
export function SeoAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  if (!id) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          var cfg = { anonymize_ip: true };
          // /r/<token> and /p/<token> put a signed, 120-day bearer credential in
          // the path. GA4's automatic page_view would ship it to Google, where
          // anyone with report or BigQuery access could replay the link and read
          // a student's marked script or progress report. Redact the segment;
          // every other page keeps GA's own defaults, hash and all.
          var m = location.pathname.match(/^\/(p|r)\/[^/]+/);
          if (m) {
            cfg.page_path = '/' + m[1] + '/[token]';
            cfg.page_location = location.origin + cfg.page_path;
          }
          gtag('config', '${id}', cfg);
        `}
      </Script>
    </>
  )
}
