"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Film,
  LayoutDashboard,
  Lightbulb,
  PlusCircle,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reels", href: "/ideas", icon: Lightbulb },
  { label: "New", href: "/ideas/new", icon: PlusCircle }
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/ideas") return pathname === "/ideas" || /^\/ideas\/[^/]+$/.test(pathname);
  return pathname.startsWith(href);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface md:flex">
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 truncate">{APP_NAME}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 leading-tight truncate">{APP_NAME}</div>
              <div className="text-xs text-gray-400">{APP_TAGLINE}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                  active
                    ? "bg-brand-50 text-brand-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-4 pb-24 md:p-8 md:pb-8">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 grid grid-cols-3">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs",
                active ? "text-brand-600 font-medium" : "text-gray-500"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
