import type { Route } from "next";
import Link from "next/link";

const YEAR = new Date().getFullYear();

const INTERNAL_LINKS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/docs" as Route, label: "Documentation" },
  { href: "/rules" as Route, label: "AI Rules" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Effect Patterns Hub
          </p>
          <h2 className="text-2xl font-bold text-foreground">Build resilient Effect applications faster.</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Curated learning paths, production-ready patterns, and AI-first workflows designed for the Effect community.
          </p>
        </div>

        <div className="flex flex-col gap-6 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">© {YEAR} Effect Patterns Hub. All rights reserved.</div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
            {INTERNAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/PaulJPhilp/Effect-Patterns"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-primary"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}


