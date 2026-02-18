import "@/styles/globals.css";

import { type Metadata } from "next";
import { Inter, JetBrains_Mono, DM_Serif_Display } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { AppNavigationMenu } from "@/components/navigation-menu";
import { Providers } from "./providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "InsurFlow",
  description:
    "Client-first life insurance planning with personalized financial guidance",
  icons: {
    icon: "/insurflow-logo.png",
    apple: "/insurflow-logo.png",
  },
};

/**
 * Inter - Primary UI font
 * Optimized for screen readability with excellent legibility at small sizes.
 * Used for all UI text, headings, and body content.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * JetBrains Mono - Monospace font for financial data
 * Features tabular figures for aligned number columns.
 * Used for currency values, percentages, and financial calculations.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/**
 * DM Serif Display - Display font for headlines
 * Elegant, authoritative serif that conveys trust and professionalism.
 * Used for hero headlines and key marketing text.
 */
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-display",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerifDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="vtag-ai-js"
          src="https://r2.leadsy.ai/tag.js"
          data-pid="5qMJdgcChCsGA9gE"
          data-version="062024"
          strategy="lazyOnload"
        />
      </head>
      <body>
        <Providers>
          <AppNavigationMenu />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
