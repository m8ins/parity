import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/lib/locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Parity",
  description: "Energy contract tracking and optimization",
};

/** First locale from the Accept-Language header, validated; falls back to en-US. */
function pickLocale(acceptLanguage: string | null): string {
  const first = acceptLanguage?.split(",")[0]?.trim();
  if (!first) return "en-US";
  try {
    Intl.getCanonicalLocales(first);
    return first;
  } catch {
    return "en-US";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = pickLocale((await headers()).get("accept-language"));

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`bg-neutral-50 ${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <LocaleProvider locale={locale}>
          <Header />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
