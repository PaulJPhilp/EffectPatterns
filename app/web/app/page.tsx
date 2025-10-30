import Link from "next/link";
import { PatternCard } from "../components/pattern-card.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.js";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Effect Patterns Hub
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
            Build production-grade Effect apps with confidence.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Explore curated roadmaps, reusable Effect patterns, and AI-assisted workflows that help your team ship resilient systems faster.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/patterns">Browse patterns</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/modules">View learning paths</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <Card hoverable>
            <CardHeader>
              <CardTitle>What’s inside</CardTitle>
              <CardDescription>
                Structured content that blends theory, implementation, and testing strategies for modern Effect apps.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <span>• Progressive learning modules from fundamentals to advanced orchestration.</span>
              <span>• Production-ready effect patterns with DI, error handling, and observability baked in.</span>
              <span>• Companion tooling and AI rules that keep teams aligned.</span>
            </CardContent>
          </Card>
          <Card hoverable>
            <CardHeader>
              <CardTitle>Stay in flow</CardTitle>
              <CardDescription>
                Bring Effect patterns directly into your editor with the Effect Patterns Toolkit and AI integrations.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Featured patterns</h2>
            <p className="text-sm text-muted-foreground">Start with the patterns teams rely on most.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/patterns">See all patterns</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <PatternCard
            id="handle-errors-with-catch"
            title="Handle errors with catch"
            summary="Manage domain-specific failures with tagged errors and resilient recovery strategies."
            skillLevel="beginner"
            tags={["error-handling", "catchTag", "observability"]}
          />
          <PatternCard
            id="retry-with-backoff"
            title="Retry with backoff"
            summary="Compose adaptive retry policies with Effect schedules and telemetry hooks."
            skillLevel="intermediate"
            tags={["schedules", "reliability", "policies"]}
          />
          <PatternCard
            id="provide-layer-dependency"
            title="Provide layer dependency"
            summary="Wire services via Layer-based dependency injection with confidence and clarity."
            skillLevel="advanced"
            tags={["layers", "services", "di"]}
          />
        </div>
      </section>
    </main>
  );
}
