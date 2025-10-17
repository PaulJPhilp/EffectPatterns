import React from "react";
export default function PatternPage({
  params,
}: {
  params: { patternId: string };
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-8 font-bold text-4xl">Pattern: {params.patternId}</h1>

      {/* TODO: Load pattern from Catalog and render MDX */}
      <div className="prose max-w-none">
        <p className="text-gray-600">
          Pattern content will be rendered here with MDX
        </p>
      </div>
    </main>
  );
}
