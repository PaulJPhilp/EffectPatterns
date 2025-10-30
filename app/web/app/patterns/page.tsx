import Link from "next/link";
import { PatternCard } from "../../components/pattern-card.js";
import { Button } from "../../components/ui/button.js";

export default function PatternsIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-bold sm:text-4xl">Pattern Library</h1>
          <p className="max-w-2xl text-muted-foreground">
            A three-layer index of Effect patterns spanning infrastructure, domain, and experience layers. Full search and tagging arrive soon.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/modules">Browse roadmaps</Link>
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <PatternCard
          id="handle-errors-with-catch"
          title="Handle errors with catch"
          summary="Manage domain failures via tagged errors, smart recovery, and observability hooks."
          skillLevel="beginner"
          tags={["errors", "catchTag", "recovery"]}
        />
        <PatternCard
          id="retry-with-backoff"
          title="Retry with backoff"
          summary="Coordinate schedules, telemetry, and circuit breakers for resilient retries."
          skillLevel="intermediate"
          tags={["retry", "schedules", "resilience"]}
        />
        <PatternCard
          id="provide-layer-dependency"
          title="Provide layer dependency"
          summary="Compose Layer graphs to provision services and cross-cutting infrastructure."
          skillLevel="advanced"
          tags={["layers", "services", "composition"]}
        />
      </section>
    </main>
  );
}


