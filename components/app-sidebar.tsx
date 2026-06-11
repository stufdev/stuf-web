"use client"

import * as React from "react"
import {
  CreditCard,
  Flag,
  Goal,
  LayoutGrid,
  Milestone,
  Target,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { LogoMark } from "@/app/components/logo-mark"
import { useLanguage } from "@/app/language-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isModuleActive(pathname: string, segment: string) {
  return pathname === segment || pathname.startsWith(`${segment}/`)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navMain = [
    {
      title: t("Core workflow"),
      icon: LayoutGrid,
      items: [
        { title: t("Fixtures"), url: "/fixtures", isActive: isRouteActive(pathname, "/fixtures") },
        { title: t("Comparison"), url: "/comparison", isActive: isRouteActive(pathname, "/comparison") },
        { title: t("Streaks"), url: "/streaks", isActive: isRouteActive(pathname, "/streaks") },
      ],
    },
    {
      title: t("Coverage"),
      icon: Trophy,
      items: [
        { title: "World Cup 2026", url: "/world-cup", isActive: isRouteActive(pathname, "/world-cup") },
        { title: t("Player Props"), url: "/player-props", isActive: isRouteActive(pathname, "/player-props") },
      ],
    },
  ]

  const marketItems = [
    { name: t("Corners"), url: "/corners", icon: Flag, isActive: isRouteActive(pathname, "/corners") },
    { name: "Shots", url: "/shots/detailed", icon: Target, isActive: isModuleActive(pathname, "/shots") },
    {
      name: t("Goals"),
      icon: Goal,
      isActive: isModuleActive(pathname, "/goals"),
      items: [
        { name: "Overs", url: "/goals/overs", isActive: isRouteActive(pathname, "/goals/overs") },
        { name: "Team Goals", url: "/goals/team-goals", isActive: isRouteActive(pathname, "/goals/team-goals") },
        { name: "Goals By Half", url: "/goals/by-half", isActive: isRouteActive(pathname, "/goals/by-half") },
      ],
    },
    { name: "Offsides", url: "/offsides", icon: Milestone, isActive: isRouteActive(pathname, "/offsides") },
    { name: t("Cards"), url: "/cards", icon: CreditCard, isActive: isRouteActive(pathname, "/cards") },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/fixtures">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LogoMark className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">STUF</span>
                  <span className="truncate text-xs">Football Analytics</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={t("Platform")} items={navMain} />
        <NavProjects label={t("Markets")} items={marketItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "Local workspace",
            email: "stuf@local",
            avatar: "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
