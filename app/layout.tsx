import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LanguageProvider } from "./language-provider";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "STUF",
  description: "Professional football analytics workspace",
};

function NavMenu({
  items,
  label,
}: {
  items: Array<{ href: string; label: string }>;
  label: string;
}) {
  return (
    <div className="group relative">
      <button className="underline" type="button">
        {label}
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-48 border border-[var(--app-border)] bg-[var(--app-panel)] p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <Link
            className="block rounded px-3 py-2 text-sm text-[var(--app-text)] hover:bg-[var(--app-panel-muted)]"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

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
                <NavMenu
                  label="Corners"
                  items={[
                    { href: "/corners", label: "Detailed" },
                    { href: "/corners/quick", label: "Quick Search" },
                  ]}
                />
                <NavMenu
                  label="Shots"
                  items={[
                    { href: "/shots/detailed", label: "Detailed" },
                    { href: "/shots/quick", label: "Quick Search" },
                  ]}
                />
                <NavMenu
                  label="Goals"
                  items={[
                    { href: "/goals", label: "Goals Home" },
                    { href: "/goals/overs", label: "Overs Detailed" },
                    { href: "/goals/overs/quick", label: "Overs Quick" },
                    { href: "/goals/team-goals", label: "Team Goals Detailed" },
                    { href: "/goals/team-goals/quick", label: "Team Goals Quick" },
                    { href: "/goals/by-half", label: "By Half Detailed" },
                    { href: "/goals/by-half/quick", label: "By Half Quick" },
                  ]}
                />
                <NavMenu
                  label="Offsides"
                  items={[
                    { href: "/offsides", label: "Detailed" },
                    { href: "/offsides/quick", label: "Quick Search" },
                  ]}
                />
                <NavMenu
                  label="Cards"
                  items={[
                    { href: "/cards", label: "Detailed" },
                    { href: "/cards/quick", label: "Quick Search" },
                  ]}
                />
              </nav>
            </div>
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
