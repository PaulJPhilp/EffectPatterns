import React from "react";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <p className="text-muted-foreground font-medium">
              © {new Date().getFullYear()} Effect Patterns Hub
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Learn Effect through curated patterns and AI-assisted learning
            </p>
          </div>

          <nav className="flex flex-wrap gap-6">
            <a
              href="https://github.com/PaulJPhilp/Effect-Patterns"
              className="text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a href="/docs" className="text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors">
              Docs
            </a>
            <a href="/rules" className="text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors">
              Rules
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}


