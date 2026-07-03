import type { Metadata } from "next";
import { Newsreader, Instrument_Sans, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";
import "./fonts/handwritten.css";
import { ThemeProvider } from "@/lib/design-system/ThemeProvider";
import { AppChrome } from "@/components/layout/AppChrome";
import { RootHeader } from "@/components/layout/RootHeader";
import { RootFooter } from "@/components/layout/RootFooter";
import { MobileTabBarGate } from "@/components/layout/MobileTabBarGate";
import { NavigationLoader } from "@/components/ui/NavigationLoader";
import { InternalNavigationCapture } from "@/components/ui/InternalNavigationCapture";
import { ScrollToTopOnRoute } from "@/components/ui/ScrollToTopOnRoute";
import { OmniFABGate } from "@/components/omni-ai/OmniFABGate";
import { OmniAIProviders } from "@/components/omni-ai/OmniAIProviders";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { OmniAILazy } from "@/components/omni-ai/OmniAILazy";
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

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
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
        <ThemeProvider>
          <OmniAIProviders>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--ec-brand)] focus:px-4 focus:py-2 focus:font-semibold focus:text-[var(--ec-on-brand-text)]"
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
            </AppChrome>
            <OmniAILazy />
          </OmniAIProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
