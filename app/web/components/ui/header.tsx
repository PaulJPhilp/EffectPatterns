"use client";

import type { Route } from "next";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";

const NAV_LINKS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/modules", label: "Modules" },
  { href: "/patterns", label: "Patterns" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle color theme"
      className="text-muted-foreground hover:text-foreground"
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </Button>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-md px-1 py-1 focus-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/80 text-sm font-bold text-background shadow-sm transition group-hover:bg-orange">
            EP
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground transition group-hover:text-primary">
            Effect Patterns Hub
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((nav) => {
            const isActive = pathname === nav.href;
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                {nav.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" variant="secondary" className="hidden md:inline-flex">
            <Link href="/patterns">Explore patterns</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}


