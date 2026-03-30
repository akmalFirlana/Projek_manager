"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kelola-projek", label: "Kelola Projek", icon: FolderKanban },
  { href: "/catatan", label: "Catatan", icon: StickyNote },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Floating Icon Sidebar */}
      <aside className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 flex-col gap-2 p-2 glass-panel rounded-lg z-50 border-black/10 dark:border-white/10 shadow-2xl">
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="absolute left-14 px-2 py-1 bg-background border border-border text-xs font-medium text-foreground rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Floating Bottom Bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-14 glass-panel rounded z-50 flex items-center justify-around px-2 border-white/10 shadow-2xl">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1 rounded transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
