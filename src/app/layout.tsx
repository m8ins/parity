import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/lib/locale";
import "./globals.css";
import { InteractionMode } from "@/components/ui/interaction-mode";

export const metadata: Metadata = {
  title: "Parity",
  description: "Strom- und Gasverbrauch verstehen und Zählerstände erfassen.",
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
    <html lang="de" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <LocaleProvider locale={locale}>
          <InteractionMode />
          <Header />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
