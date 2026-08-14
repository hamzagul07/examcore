import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./fonts/handwritten.css";
import { ThemeProvider } from "@/lib/design-system/ThemeProvider";
import { AppChrome } from "@/components/layout/AppChrome";
import { RootHeader } from "@/components/layout/RootHeader";
import { RootFooter } from "@/components/layout/RootFooter";
import { MobileTabBarGate } from "@/components/layout/MobileTabBarGate";
import { NavigationLoader } from "@/components/ui/NavigationLoader";
import { PendingMarkWatcher } from "@/components/mark/PendingMarkWatcher";
import { InternalNavigationCapture } from "@/components/ui/InternalNavigationCapture";
import { ScrollToTopOnRoute } from "@/components/ui/ScrollToTopOnRoute";
import { OmniFABGate } from "@/components/omni-ai/OmniFABGate";
import { OmniAIProviders } from "@/components/omni-ai/OmniAIProviders";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { OmniAILazy } from "@/components/omni-ai/OmniAILazy";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SeoAnalytics } from "@/components/seo/SeoAnalytics";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { SITE_ICONS } from "@/lib/seo/metadata";
import {
  DEFAULT_SITE_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site-config";

const EC_THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('ec-theme');var ec=t==='late-night'?'late-night':'zen';document.documentElement.setAttribute('data-ec-theme',ec);document.documentElement.setAttribute('data-theme',t==='late-night'?'night':'paper');}catch(e){document.documentElement.setAttribute('data-theme','paper');}})();`;

/**
 * Self-hosted rather than fetched from Google at build time.
 *
 * `next/font/google` downloads each family during the build, and that fetch
 * failed three times in roughly ten builds — twelve "Can't resolve
 * @vercel/turbopack-next/internal/font/google/font" errors, always passing on a
 * retry, including once with nothing else running. A build that depends on a
 * third-party network call is a build that fails for reasons no commit caused.
 *
 * These are the same latin woff2 files Google serves, at the same weights and
 * styles as before. All four families are OFL-licensed, which permits
 * redistribution — see app/fonts/files/OFL.txt.
 *
 * Newsreader and Caveat and Instrument Sans are variable, so one file covers the
 * whole 400-700 range; IBM Plex Mono is static and needs a file per weight.
 */
const newsreader = localFont({
  src: [
    { path: "./fonts/files/newsreader-normal.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/files/newsreader-italic.woff2", weight: "400 700", style: "italic" },
  ],
  display: "swap",
  variable: "--font-display",
});

// Only the hero display font (Newsreader, the mobile LCP element) is preloaded.
// The rest still load on demand via `swap`, but stop competing for throttled
// bandwidth against the LCP font's preload.
const instrumentSans = localFont({
  src: [{ path: "./fonts/files/instrument-sans.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  preload: false,
  variable: "--font-sans",
});

const ibmPlexMono = localFont({
  src: [
    { path: "./fonts/files/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/files/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/files/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-mono",
});

const caveat = localFont({
  src: [{ path: "./fonts/files/caveat.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  preload: false,
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Cambridge past paper marking — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  icons: SITE_ICONS,
  keywords: [...SEO_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
    description: DEFAULT_SITE_DESCRIPTION,
    images: [{ url: "/api/og/page/home", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? undefined,
  },
  alternates: {
    canonical: SITE_URL,
    types: {
      "application/rss+xml": `${SITE_URL.replace(/\/$/, "")}/feed.xml`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" data-ec-theme="zen" data-theme="paper" className="h-full overflow-x-clip antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EC_THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${newsreader.variable} ${instrumentSans.variable} ${ibmPlexMono.variable} ${caveat.variable} ${instrumentSans.className} relative flex min-h-full max-w-[100vw] flex-col overflow-x-clip text-base leading-[1.55]`}
      >
        <SiteJsonLd />
        <SeoAnalytics />
        <Analytics />
        <SpeedInsights />
        <ThemeProvider>
          <OmniAIProviders>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-[var(--ec-brand)] focus:px-4 focus:py-2 focus:font-semibold focus:text-[var(--ec-on-brand-text)]"
            >
              Skip to content
            </a>
            <AppChrome>
              <NavigationLoader />
              <InternalNavigationCapture />
              <ScrollToTopOnRoute />
              <VisitTracker />
              <RootHeader />
              <div
                id="main-content"
                tabIndex={-1}
                className="relative z-[1] flex min-w-0 flex-1 flex-col outline-none"
              >
                {children}
              </div>
              <RootFooter />
              <MobileTabBarGate />
              <OmniFABGate />
              {/* Announces a mark that finished while the student was reading
                  something else. Mounted app-wide because the whole point is
                  that it works away from /mark. */}
              <PendingMarkWatcher />
            </AppChrome>
            <OmniAILazy />
          </OmniAIProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
