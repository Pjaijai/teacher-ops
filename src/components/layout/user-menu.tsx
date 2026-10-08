"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/lib/i18n/routing";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <User />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">{email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings /> {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                qc.clear();
                router.replace("/sign-in");
              }}
            >
              <LogOut /> {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
