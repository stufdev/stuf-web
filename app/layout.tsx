import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { THEME_INIT_SCRIPT } from "./theme";
import { AppSidebar } from "@/components/app-sidebar";
import { FixtureModeProvider } from "./fixture-mode-provider";
import { LanguageProvider } from "./language-provider";
import { ThemeProvider } from "./theme-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
      className={cn(inter.variable, jetbrainsMono.variable, "antialiased")}
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
                    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                      <SidebarTrigger className="-ml-1" />
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
