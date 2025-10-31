import Link from "next/link";
import { Button } from "../../../components/ui/button.js";

interface ModulePageProps {
  params: { moduleId: string };
}

export default function ModulePage({ params }: ModulePageProps) {
  const moduleTitle = params.moduleId.replace(/-/g, " ");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-sm text-muted-foreground">
          <Link href="/modules">← Back to modules</Link>
        </Button>
        <h1 className="text-balance text-3xl font-bold sm:text-4xl">{moduleTitle}</h1>
        <p className="text-muted-foreground">
          Detailed lessons, patterns, and exercises for this module will be available soon. Subscribe to updates to be notified when content ships.
        </p>
      </div>

      <section className="rounded-lg border border-dashed border-border/70 bg-card/40 p-8 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Module content loading</p>
        <p className="mt-2">
          We’re finalizing the curriculum and interactive labs for this module. In the meantime, explore related patterns and rules in the main library.
        </p>
      </section>
    </main>
  );
}
