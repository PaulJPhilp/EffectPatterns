import Link from "next/link";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

export interface PatternCardProps {
  id: string;
  title: string;
  summary: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  tags?: string[];
}

const SKILL_VARIANTS: Record<PatternCardProps["skillLevel"], "secondary" | "accent" | "destructive"> = {
  beginner: "secondary",
  intermediate: "accent",
  advanced: "destructive",
};

export function PatternCard({ id, title, summary, skillLevel, tags }: PatternCardProps) {
  return (
    <Card hoverable className="group flex h-full flex-col justify-between">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          <Badge variant={SKILL_VARIANTS[skillLevel]} className="px-3 py-1">
            {skillLevel}
          </Badge>
          <span className="text-muted-foreground/70">Pattern</span>
        </div>
        <CardTitle className="text-balance text-2xl">
          <Link
            href={`/patterns/${id}`}
            className="focus-ring rounded-md px-1 py-0.5 text-foreground transition-colors hover:text-primary"
          >
            {title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {summary}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="lowercase tracking-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="px-0 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          <Link href={`/patterns/${id}`} className={cn("inline-flex items-center gap-1")}>
            View pattern
            <span aria-hidden>→</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

