import "@/styles/globals.css";

import { type Metadata } from "next";
import { Public_Sans } from "next/font/google";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "InsurFlow",
  description:
    "AI-powered financial needs analysis for life insurance advisors",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
