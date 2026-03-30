"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function SettingsWidget() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100]" ref={menuRef}>
      {/* Dropdown Menu */}
      <div 
        className={cn(
          "absolute bottom-16 right-0 w-56 glass-panel rounded-xl p-2 transition-all duration-300 origin-bottom-right shadow-2xl flex flex-col gap-1 border-black/10 dark:border-white/10 bg-background/80 dark:bg-card/80",
          isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-black/5 dark:border-white/5 mb-1">
          Pengaturan Tampilan
        </div>
        
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors",
            theme === "light" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <Sun className="w-4 h-4" />
          <span>Terang</span>
        </button>

        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors",
            theme === "dark" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <Moon className="w-4 h-4" />
          <span>Gelap</span>
        </button>

        <button
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors",
            theme === "system" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <MonitorSmartphone className="w-4 h-4" />
          <span>Sistem</span>
        </button>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-xl border",
          isOpen 
            ? "bg-primary text-primary-foreground border-primary/20 shadow-primary/20" 
            : "glass-panel text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 border-black/10 dark:border-white/10"
        )}
      >
        <Settings className={cn("w-5 h-5 transition-transform duration-300", isOpen && "rotate-90")} />
      </button>
    </div>
  );
}
