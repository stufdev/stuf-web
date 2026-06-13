import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { THEME_INIT_SCRIPT } from "./theme";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "./components/app-header";
import { FixtureModeProvider } from "./fixture-mode-provider";
import { LanguageProvider } from "./language-provider";
import { ThemeProvider } from "./theme-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-ui-mono",
  display: "swap",
});

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
      className={cn(geist.variable, geistMono.variable, "antialiased")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            <FixtureModeProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                      <SidebarTrigger className="-ml-1" />
                      <div className="min-w-0 flex-1">
                        <AppHeader />
                      </div>
                    </header>
                    {children}
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
            </FixtureModeProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
