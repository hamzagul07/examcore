import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Caveat, Kalam, Fraunces } from "next/font/google";
import "./globals.css";
import "./fonts/handwritten.css";
import { WireframeBackground } from "@/components/design-system/WireframeBackground";
import { ThemeProvider } from "@/lib/design-system/ThemeProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { OmniAIProviders } from "@/components/omni-ai/OmniAIProviders";
import { OmniAI } from "@/components/omni-ai/OmniAI";

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
  title: "Examcore — AI marking for Cambridge A-Level Mathematics",
  description:
    "Upload a photo of your handwritten A-Level math answer. Get mark-by-mark feedback in 30 seconds.",
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
            <WireframeBackground />
            <SiteHeader />
            <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
            <OmniAI />
          </OmniAIProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
