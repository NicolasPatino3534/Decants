"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/format";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Cambiar tema"
      title="Cambiar tema"
      suppressHydrationWarning
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-[4.4rem] shrink-0 items-center rounded-full border border-line bg-mist px-1 text-soft transition hover:border-amber focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-bg",
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center text-amber">
        <SunMedium size={16} />
      </span>
      <span className="grid h-8 w-8 place-items-center text-amber">
        <Moon size={15} />
      </span>
      <span className="theme-switch-knob absolute left-1 grid h-8 w-8 place-items-center rounded-full bg-paper text-ink shadow-soft transition-transform duration-300">
        <SunMedium className="theme-switch-light-icon" size={16} />
        <Moon className="theme-switch-dark-icon" size={15} />
      </span>
    </button>
  );
}
