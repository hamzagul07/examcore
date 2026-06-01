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
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

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
    default: `${SITE_NAME} — AI marking for Cambridge A-Levels & O-Levels`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Upload handwritten Cambridge answers and get mark-by-mark feedback in seconds. Free during early access — founding members lock in 50% off forever.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-ec-theme="late-night" className="h-full antialiased">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${caveat.variable} ${kalam.variable} ${inter.className} relative min-h-full flex flex-col`}
      >
        <ThemeProvider>
          <OmniAIProviders>
            <RootHeader />
            <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
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
