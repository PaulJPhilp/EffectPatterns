"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Button } from "./button.js";

function DarkModeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const initial = root.classList.contains("dark");
    setIsDark(initial);
  }, []);

  function onToggle() {
    const root = document.documentElement;
    const next = !isDark;
    setIsDark(next);
    root.classList.toggle("dark", next);
  }

  return (
    <Button variant="ghost" size="sm" onClick={onToggle} aria-label="Toggle dark mode" className="text-muted-foreground hover:text-foreground hover:bg-accent">
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </Button>
  );
}

export function Header() {
  const pathname = usePathname();
  const links: ReadonlyArray<{ href: Route; label: string }> = [
    { href: "/", label: "Home" },
    { href: "/modules", label: "Modules" },
    { href: "/patterns", label: "Patterns" },
    { href: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-row items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500 shadow-sm">
              <span className="text-white font-bold text-sm">EP</span>
            </div>
            <span className="text-lg font-bold bg-linear-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300 group-hover:from-orange-500 group-hover:to-orange-600 transition-all duration-200">
              Effect Patterns Hub
            </span>
          </Link>

          <nav className="flex items-center gap-4 flex-nowrap">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`font-medium transition-all duration-200 px-2 py-1 rounded-md ${
                    active
                      ? "text-orange-500 border-b-2 border-orange-500 pb-1"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="border-l border-border pl-6 ml-2">
              <DarkModeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}


