"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  Heart,
  Settings,
  LayoutDashboard,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/provider";

const navItems = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/subscriptions", label: "Subscriptions", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

const creatorNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts/new", label: "New Post", icon: Plus },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { data: me } = trpc.auth.me.useQuery();

  const isCreator = me?.role === "CREATOR";
  const { data: unread } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen sticky top-0 py-4 px-3 overflow-y-auto">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 px-3 mb-8">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="text-xl font-bold gradient-text">Brivia</span>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/feed" && pathname.startsWith(item.href));
            const showBadge = item.href === "/notifications" && (unread?.count ?? 0) > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "gradient-bg text-white shadow-md shadow-pink-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-pink-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                    {(unread?.count ?? 0) > 99 ? "99+" : (unread?.count ?? 0)}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Creator nav */}
          {isCreator && (
            <>
              <div className="border-t border-border my-3" />
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Creator
              </p>
              {creatorNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "gradient-bg text-white shadow-md shadow-pink-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="border-t border-border pt-3 px-1">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {me?.creatorProfile?.displayName ??
                  me?.fanProfile?.displayName ??
                  user?.firstName ??
                  "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {me?.role?.toLowerCase() ?? "fan"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 glass-dark border-t border-white/10 px-2 pb-safe">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/feed" && pathname.startsWith(item.href));
            const showBadge =
              item.href === "/notifications" && (unread?.count ?? 0) > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors relative",
                  isActive ? "text-pink-500" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
