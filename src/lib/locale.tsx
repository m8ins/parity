"use client";

import { createContext, useContext } from "react";

/**
 * The active BCP-47 locale for formatting dates/numbers. Provided by the server
 * (from the Accept-Language header) so server and client render identically —
 * no hydration mismatch. Falls back to "en-US".
 */
const LocaleContext = createContext<string>("en-US");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): string {
  return useContext(LocaleContext);
}
