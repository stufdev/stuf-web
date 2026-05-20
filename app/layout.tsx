import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LanguageProvider } from "./language-provider";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "STUF",
  description: "Professional football analytics workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="antialiased"
    >
      <body
        suppressHydrationWarning
      >
        <LanguageProvider>
          <ThemeProvider>
            <div className="border-b border-[var(--app-border)] px-4 py-3">
              <nav className="flex flex-wrap items-center gap-4 text-sm">
                <Link className="underline" href="/comparison">
                  Comparison
                </Link>
                <Link className="underline" href="/fixtures">
                  Fixtures
                </Link>
                <Link className="underline" href="/streaks">
                  Streaks
                </Link>
              </nav>
            </div>
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
