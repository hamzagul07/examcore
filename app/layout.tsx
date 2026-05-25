import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
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
    <html lang="en" className="h-full antialiased">
      <body
        className={`${inter.className} min-h-full flex flex-col [font-feature-settings:'cv11']`}
      >
        {children}
      </body>
    </html>
  );
}
