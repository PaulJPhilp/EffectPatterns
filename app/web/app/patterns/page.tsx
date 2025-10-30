import React from "react";
import { PatternCard } from "../../components/pattern-card.js";

export default function PatternsIndexPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Patterns</h1>
      <p className="mb-6 text-gray-600">A full searchable index is coming soon. For now, explore featured patterns:</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PatternCard
          id="handle-errors-with-catch"
          title="Handle errors with catch"
          summary="Use tagged errors and catchTag to recover from specific failures."
          skillLevel="beginner"
          tags={["errors", "tagged", "catchTag"]}
        />
        <PatternCard
          id="retry-with-backoff"
          title="Retry with backoff"
          summary="Automatically retry operations based on policies and error tags."
          skillLevel="intermediate"
          tags={["retry", "schedule", "policy"]}
        />
        <PatternCard
          id="provide-layer-dependency"
          title="Provide layer dependency"
          summary="Supply services and resources via Layer-based dependency injection."
          skillLevel="advanced"
          tags={["layer", "services", "di"]}
        />
      </div>
    </div>
  );
}


