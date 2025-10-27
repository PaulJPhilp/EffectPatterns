import React from "react";
export default function ModulePage({
  params,
}: {
  params: { moduleId: string };
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-8 font-bold text-4xl">Module: {params.moduleId}</h1>

      {/* TODO: Load patterns for this module from Catalog service */}
      <div className="space-y-4">
        <p className="text-gray-600">
          Patterns for this module will be loaded here
        </p>
      </div>
    </main>
  );
}
