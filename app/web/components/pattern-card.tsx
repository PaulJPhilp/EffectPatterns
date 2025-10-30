import React from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card.js";
import { Badge } from "./ui/badge.js";

export interface PatternCardProps {
  id: string;
  title: string;
  summary: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  tags?: string[];
}

export function PatternCard({ id, title, summary, skillLevel, tags }: PatternCardProps) {
  const skillVariant: Record<PatternCardProps["skillLevel"], "secondary" | "default" | "destructive"> = {
    beginner: "secondary",
    intermediate: "default",
    advanced: "destructive",
  };

  return (
    <Card className="group flex h-full flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={skillVariant[skillLevel]}>{skillLevel}</Badge>
        </div>
        <CardTitle className="leading-snug">
          <Link href={`/patterns/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{summary}</p>
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Link href={`/patterns/${id}`} className="text-blue-600 hover:underline">
          View pattern →
        </Link>
      </CardFooter>
    </Card>
  );
}


