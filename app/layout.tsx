import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Caveat, Kalam, Fraunces } from "next/font/google";
import "./globals.css";
import "./fonts/handwritten.css";
import { ThemeProvider } from "@/lib/design-system/ThemeProvider";
import { RootHeader } from "@/components/layout/RootHeader";
import { RootFooter } from "@/components/layout/RootFooter";
import { OmniAIProviders } from "@/components/omni-ai/OmniAIProviders";
import { OmniAI } from "@/components/omni-ai/OmniAI";
import { MobileTabBarGate } from "@/components/layout/MobileTabBarGate";
import { OmniFABGate } from "@/components/omni-ai/OmniFABGate";
import { SeoAnalytics } from "@/components/seo/SeoAnalytics";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import {
  DEFAULT_SITE_DESCRIPTION,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fraunces",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-caveat",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  variable: "--font-kalam",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
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
    <html lang="en-GB" data-ec-theme="late-night" className="h-full overflow-x-clip antialiased">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${caveat.variable} ${kalam.variable} ${inter.className} relative flex min-h-full max-w-[100vw] flex-col overflow-x-clip`}
      >
        <SiteJsonLd />
        <SeoAnalytics />
        <ThemeProvider>
          <OmniAIProviders>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--ec-brand)] focus:px-4 focus:py-2 focus:font-semibold focus:text-[var(--ec-canvas)]"
            >
              Skip to content
            </a>
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
            <OmniAI />
          </OmniAIProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
