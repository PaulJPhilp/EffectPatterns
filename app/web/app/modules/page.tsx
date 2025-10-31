import Link from "next/link";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";

const MODULES = [
  {
    id: "module-1",
    title: "Foundations",
    description: "Core Effect concepts, data types, and execution model.",
    level: "Beginner",
  },
  {
    id: "module-2",
    title: "Services & Layers",
    description: "Service-oriented Effect applications with Layer-based DI.",
    level: "Intermediate",
  },
  {
    id: "module-3",
    title: "Resilience Patterns",
    description: "Retries, supervision, and observability for production Effect.",
    level: "Advanced",
  },
];

export default function ModulesPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">Learning Paths</p>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Level up your Effect practice step-by-step.</h1>
        <p className="max-w-3xl text-muted-foreground">
          Each module guides you through curated lessons, patterns, and exercises so your team can adopt Effect with confidence.
        </p>
        <Button asChild variant="secondary" size="sm" className="w-fit">
          <Link href="/patterns">Jump to patterns</Link>
        </Button>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => (
          <Card key={module.id} hoverable>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-xl">
                <span>{module.title}</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{module.level}</span>
              </CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
                <Link href={`/modules/${module.id}`}>View module<span aria-hidden> →</span></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
