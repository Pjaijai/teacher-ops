"use client";

import { BookOpen, Calculator, History, LayoutDashboard, Library, PenLine, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { CreditsBadge } from "@/features/account/components/credits-badge";
import { useMe } from "@/features/account/api/use-me";
import { isLocalMode } from "@/lib/app-mode";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, usePathname, useRouter } from "@/lib/i18n/routing";
import { LocaleSwitcher } from "./locale-switcher";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/writing", key: "writing", icon: PenLine },
  { href: "/practice", key: "practice", icon: Calculator },
  { href: "/bank", key: "bank", icon: Library },
  { href: "/history", key: "history", icon: History },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

/** Signed-in area: sidebar, top bar with credits, and the sign-in / onboarding gate. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const me = useMe();
  const router = useRouter();

  const user = me.data?.user;
  const profile = me.data?.profile;
  useEffect(() => {
    if (me.isLoading) return;
    if (!user) router.replace("/sign-in");
    else if (profile && !profile.onboarded) router.replace("/onboarding");
  }, [me.isLoading, user, profile, router]);

  // Pages render straight away (their data comes from the API, which enforces sign-in);
  // signed-out or not-yet-onboarded students are redirected by the effect above.
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 font-semibold">
            <BookOpen className="size-5 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{t("appName")}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <Suspense fallback={<NavMenu active={null} />}>
                <ActiveNavMenu />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {isLocalMode ? null : user && profile ? <UserMenu name={profile.displayName} email={user.email} /> : <Skeleton className="h-10 w-full" />}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="bg-background/95 sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-3 backdrop-blur print:hidden">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <CreditsBadge />
            <Suspense>
              <LocaleSwitcher />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Reads the route (suspends under dynamic routes, so it sits in its own Suspense boundary). */
function ActiveNavMenu() {
  return <NavMenu active={usePathname()} />;
}

function NavMenu({ active }: { active: string | null }) {
  const t = useTranslations("common");
  const bank = useTranslations("bank");
  return (
    <SidebarMenu>
      {NAV.map((item) => {
        const label = item.key === "bank" && isLocalMode ? bank("navLabel") : t(`nav.${item.key}`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={Boolean(active?.startsWith(item.href))} tooltip={label}>
              <Link href={item.href}>
                <item.icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
