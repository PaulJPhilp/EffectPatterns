"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Copy, Check, Tag, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SemanticSearchResult } from "@/lib/semantic-search/search";

export interface MemoryCardProps {
  result: SemanticSearchResult;
  onSelect?: (result: SemanticSearchResult) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
}

/**
 * MemoryCard - Display individual memory with metadata
 *
 * Shows:
 * - Conversation title/summary
 * - Tags for quick categorization
 * - Outcome badge (solved, unsolved, partial, revisited)
 * - Satisfaction score with visual indicator
 * - Relevance scores (semantic, keyword, recency, satisfaction)
 * - Last accessed/created date
 * - Preview of conversation content
 * - Link to full conversation
 * - Copy memory ID button
 */
export function MemoryCard({
  result,
  onSelect,
  isSelectable = false,
  isSelected = false,
}: MemoryCardProps) {
  const [copied, setCopied] = useState(false);

  const metadata = result.metadata;
  // Provide default scores if missing - cast to any to allow dynamic properties
  const scores = (result.score || {
    vector: "0%",
    keyword: "0%",
    recency: "0%",
    satisfaction: "0%",
    final: "0%",
  }) as any;

  // Extract title - for patterns use title field, for conversations use content
  const title = (
    (metadata as any).title || // Pattern title
    metadata.content
      ?.split("\n")[0]
      ?.substring(0, 100)
      ?.trim() ||
    (metadata as any).patternId ||
    "Untitled"
  );

  // Extract preview - prefer summary for patterns, content for conversations
  const preview = (
    (metadata as any).summary || // Pattern summary
    (metadata.content || "")
      .split("\n")
      .slice(1, 3)
      .join(" ")
      .substring(0, 150)
      .trim() ||
    "No preview available"
  );

  // Format date - handle invalid timestamps
  let relativeDate = "Unknown date";
  if (metadata.timestamp) {
    try {
      const date = new Date(metadata.timestamp);
      if (!isNaN(date.getTime())) {
        relativeDate = formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (e) {
      // Keep default "Unknown date"
    }
  }

  // Get outcome badge styling
  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case "solved":
        return {
          variant: "default" as const,
          icon: CheckCircle,
          label: "Solved",
          color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        };
      case "unsolved":
        return {
          variant: "destructive" as const,
          icon: AlertCircle,
          label: "Unsolved",
          color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
        };
      case "partial":
        return {
          variant: "secondary" as const,
          icon: HelpCircle,
          label: "Partially Solved",
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        };
      case "revisited":
        return {
          variant: "outline" as const,
          icon: Tag,
          label: "Revisited",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
        };
      default:
        return {
          variant: "secondary" as const,
          icon: HelpCircle,
          label: "Unknown",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
        };
    }
  };

  const outcomeBadge = getOutcomeBadge(metadata.outcome);
  const OutcomeIcon = outcomeBadge.icon;

  // Satisfaction score (0-5)
  const satisfactionScore = metadata.satisfactionScore || 0;
  const satisfactionPercent = (satisfactionScore / 5) * 100;

  // Handle copy to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-lg",
        isSelectable && "hover:ring-2 hover:ring-primary/50"
      )}
      onClick={() => isSelectable && onSelect?.(result)}
    >
      {/* Header with title and outcome */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {relativeDate}
            </p>
          </div>

          {/* Outcome badge */}
          <Badge
            variant={outcomeBadge.variant}
            className="shrink-0 whitespace-nowrap flex items-center gap-1"
            title={outcomeBadge.label}
          >
            <OutcomeIcon className="w-3 h-3" />
            {outcomeBadge.label}
          </Badge>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-4">
        {/* Preview */}
        {preview && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {preview}
          </p>
        )}

        {/* Tags */}
        {metadata.tags && (
          (() => {
            // Handle both string and array formats for tags
            const tags = metadata.tags as any;
            let tagsArray: string[] = [];
            if (Array.isArray(tags)) {
              tagsArray = tags;
            } else if (typeof tags === "string") {
              tagsArray = tags.split(",").map((t: string) => t.trim());
            }

            return (
              tagsArray.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tagsArray.slice(0, 5).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tagsArray.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{tagsArray.length - 5}
                    </Badge>
                  )}
                </div>
              )
            );
          })()
        )}

        {/* Satisfaction Score */}
        {satisfactionScore > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Satisfaction:
            </span>
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-green-500 transition-all"
                  style={{ width: `${satisfactionPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground">
                {satisfactionScore.toFixed(1)}/5
              </span>
            </div>
          </div>
        )}

        {/* Relevance Scores */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div className="bg-muted p-2 rounded">
            <div className="text-muted-foreground font-medium">Semantic</div>
            <div className="font-semibold text-foreground">
              {scores?.vector ?? "0%"}
            </div>
          </div>
          <div className="bg-muted p-2 rounded">
            <div className="text-muted-foreground font-medium">Keyword</div>
            <div className="font-semibold text-foreground">
              {scores?.keyword ?? "0%"}
            </div>
          </div>
          <div className="bg-muted p-2 rounded">
            <div className="text-muted-foreground font-medium">Recency</div>
            <div className="font-semibold text-foreground">
              {scores?.recency ?? "0%"}
            </div>
          </div>
          <div className="bg-muted p-2 rounded">
            <div className="text-muted-foreground font-medium">Final Score</div>
            <div className="font-semibold text-foreground">
              {scores?.final ?? "0%"}
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {/* Chat ID or Pattern ID */}
          <div className="flex-1 min-w-0">
            <code className="text-xs text-muted-foreground break-all">
              {result.id}
            </code>
          </div>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            title="Copy memory ID"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="sr-only">
              {copied ? "Copied" : "Copy"}
            </span>
          </Button>

          {/* View conversation/pattern link - only show if chatId exists */}
          {metadata.chatId && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
              title="View full conversation"
            >
              <Link href={`/chat/${metadata.chatId}`}>
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">View conversation</span>
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MemoryCardSkeleton - Loading placeholder
 */
export function MemoryCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
          <div className="h-6 bg-muted rounded-full w-24 shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />

        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-muted rounded-full w-16" />
          ))}
        </div>

        <div className="h-2 bg-muted rounded-full" />

        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <div className="flex-1 h-4 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
