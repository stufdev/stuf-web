"use client"

import {
  ChevronsUpDown,
  Globe,
  House,
  LogOut,
  Moon,
  Sun,
  Trophy,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/app/language-provider"
import { useTheme } from "@/app/theme-provider"
import type { AppLanguage } from "@/app/i18n"
import type { ThemeMode } from "@/app/theme"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { themeMode, setThemeMode } = useTheme()

  const subtitle =
    language === "es" ? "Preferencias locales" : "Local preferences"

  const resetLocalSession = () => {
    window.localStorage.removeItem("stuf-language")
    window.localStorage.removeItem("stuf-theme-mode")
    window.localStorage.removeItem("stuf_fixture_mode")
    window.location.assign("/fixtures")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">ST</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{subtitle}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">ST</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{subtitle}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("Language")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => setLanguage(value as AppLanguage)}
              value={language}
            >
              <DropdownMenuRadioItem value="en">
                <Globe />
                English
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="es">
                <Globe />
                Espanol
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => setThemeMode(value as ThemeMode)}
              value={themeMode}
            >
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                <Sun />
                {t("Light mode")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                {t("Dark mode")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/fixtures")}>
              <House />
              {t("Fixtures")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/world-cup")}>
              <Trophy />
              World Cup 2026
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={resetLocalSession}>
              <LogOut />
              {language === "es" ? "Reiniciar sesion local" : "Reset local session"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
