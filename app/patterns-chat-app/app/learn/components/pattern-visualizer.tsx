"use client";

import { useState } from "react";

interface FlowStep {
  step: number;
  title: string;
  description: string;
}

interface PatternVisualizerProps {
  patternId: string;
  title: string;
  description: string;
  code: string;
  language?: string;
  flowSteps?: FlowStep[];
  highlightConcepts?: string[];
  difficulty?: string;
  category?: string;
  tags?: string[];
}

export function PatternVisualizer({
  patternId,
  title,
  description,
  code,
  flowSteps = [],
  highlightConcepts = [],
  difficulty,
  category,
  tags = [],
}: PatternVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"code" | "flow">("code");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-4 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-muted/30 shadow-lg">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{title}</h3>
              {difficulty && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  difficulty === "beginner"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : difficulty === "intermediate"
                    ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}>
                  {difficulty}
                </span>
              )}
              {category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {category}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      {isExpanded && (
        <>
          <div className="border-b bg-background/50 px-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "code"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              📝 Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("flow")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "flow"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              🔄 Flow
            </button>
          </div>

          {/* Content */}
          <div className="p-4 bg-background/30">
            {activeTab === "code" ? (
              <div className="space-y-3">
                <div className="rounded-lg border bg-background p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code className="language-typescript">{code}</code>
                  </pre>
                </div>
                {highlightConcepts.length > 0 && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">
                      Key Concepts:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {highlightConcepts.map((concept) => (
                        <span
                          key={concept}
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Visual representation of how this Effect pattern executes:
                </p>
                <div className="space-y-3">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step.step}
                      className="flex items-start gap-3 group"
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {step.step}
                        </div>
                        {index < flowSteps.length - 1 && (
                          <div className="w-0.5 h-full min-h-[24px] bg-primary/30 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="font-semibold text-sm mb-1">
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-background/50 px-4 py-2 text-xs text-muted-foreground">
            <span>Pattern ID: {patternId}</span>
          </div>
        </>
      )}
    </div>
  );
}

